import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Header from "@/components/Header";
import { Search, MapPin, Briefcase, DollarSign, Star, ExternalLink, Filter, Bell, Bookmark } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { VerificationBadge } from "@/components/VerificationBadge";
import { JobApplicationDialog } from "@/components/JobApplicationDialog";
import { JobAlertsDialog } from "@/components/JobAlertsDialog";
import { useJobBookmark } from "@/hooks/useJobBookmark";
import { JobCard } from "@/components/JobCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

  interface Job {
  id: string;
  title: string;
  company_name: string | null;
  description: string;
  location: string | null;
  budget_min: number;
  budget_max: number;
  required_skills: Json | null;
  remote: boolean | null;
  status: string;
  is_featured: boolean | null;
  ai_scraped: boolean | null;
  external_url: string | null;
  verification_status: string | null;
  created_at: string;
  employers?: { 
    company_name: string;
    verification_level?: "unverified" | "basic" | "verified" | "premium";
    trust_score?: number;
    average_rating?: number;
  };
}

const JobBoard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [budgetRange, setBudgetRange] = useState([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [ratingFilter, setRatingFilter] = useState("0");
  
  // Application dialog state
  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string; companyName: string } | null>(null);
  
  // Job alerts dialog state
  const [jobAlertsDialogOpen, setJobAlertsDialogOpen] = useState(false);

  useEffect(() => {
    fetchJobs();
    fetchSavedSearches();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('job-board-jobs')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'jobs',
          filter: 'status=eq.open'
        },
        () => {
          fetchJobs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchSavedSearches = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setSavedSearches(data);
  };

  const saveCurrentSearch = async () => {
    if (!searchName.trim()) {
      toast({ title: "Error", description: "Please enter a name for this search", variant: "destructive" });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "Error", description: "Please sign in to save searches", variant: "destructive" });
      return;
    }

    const filters = {
      searchQuery,
      selectedLocation,
      selectedType,
      budgetRange,
      ratingFilter
    };

    const { error } = await supabase
      .from("saved_searches")
      .insert({
        user_id: user.id,
        name: searchName,
        filters
      });

    if (error) {
      toast({ title: "Error", description: "Failed to save search", variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Search saved successfully!" });
      setShowSaveSearch(false);
      setSearchName("");
      fetchSavedSearches();
    }
  };

  const loadSavedSearch = (search: any) => {
    const filters = search.filters;
    setSearchQuery(filters.searchQuery || "");
    setSelectedLocation(filters.selectedLocation || "all");
    setSelectedType(filters.selectedType || "all");
    setBudgetRange(filters.budgetRange || [0, 10000]);
    setRatingFilter(filters.ratingFilter || "0");
    toast({ title: "Success", description: `Loaded search: ${search.name}` });
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          employers (company_name)
        `)
        .eq("status", "open")
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;

      setJobs(data || []);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getCompanyName = (job: Job) => {
    return job.company_name || job.employers?.company_name || "Company";
  };

  const getSkills = (job: Job): string[] => {
    if (!job.required_skills) return [];
    if (Array.isArray(job.required_skills)) return job.required_skills as string[];
    return [];
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      searchQuery === "" ||
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      getCompanyName(job).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation =
      selectedLocation === "all" ||
      (job.location && job.location.toLowerCase().includes(selectedLocation.toLowerCase()));

    const matchesType =
      selectedType === "all" ||
      (selectedType === "remote" && job.remote) ||
      (selectedType === "on-site" && !job.remote);

    const matchesBudget =
      job.budget_min >= budgetRange[0] && job.budget_max <= budgetRange[1];

    const matchesRating =
      ratingFilter === "0" ||
      (job.employers?.average_rating || 0) >= parseFloat(ratingFilter);

    return matchesSearch && matchesLocation && matchesType && matchesBudget && matchesRating;
  });

  const uniqueLocations = Array.from(
    new Set(jobs.map((job) => job.location).filter((loc): loc is string => Boolean(loc)))
  );

  const handleApplyClick = (job: Job) => {
    setSelectedJob({
      id: job.id,
      title: job.title,
      companyName: getCompanyName(job),
    });
    setApplicationDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-4 mb-4 flex-wrap">
            <h1 className="text-4xl font-bold">Find Your Next Opportunity</h1>
            <Button onClick={() => setJobAlertsDialogOpen(true)} variant="outline" className="gap-2">
              <Bell className="h-4 w-4" />
              Job Alerts
            </Button>
            <Button variant="outline" onClick={() => setShowSaveSearch(true)}>
              <Bookmark className="h-4 w-4 mr-2" />
              Save Search
            </Button>
            {savedSearches.length > 0 && (
              <Select onValueChange={(id) => {
                const search = savedSearches.find(s => s.id === id);
                if (search) loadSavedSearch(search);
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Load saved search" />
                </SelectTrigger>
                <SelectContent>
                  {savedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>
                      {search.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-lg text-muted-foreground">
            Browse {jobs.length} verified job opportunities across Africa and worldwide
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-8">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-5 w-5" />
                <Input
                  placeholder="Search jobs by title, skills, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-12 text-lg"
                />
              </div>

              {/* Filter Toggle */}
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="w-full md:w-auto"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>

              {/* Filters */}
              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {uniqueLocations.map((location) => (
                          <SelectItem key={location} value={location || ""}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Job Type</label>
                    <Select value={selectedType} onValueChange={setSelectedType}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="on-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
                    <Select value={ratingFilter} onValueChange={setRatingFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Rating" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">All Ratings</SelectItem>
                        <SelectItem value="3">3+ Stars</SelectItem>
                        <SelectItem value="4">4+ Stars</SelectItem>
                        <SelectItem value="4.5">4.5+ Stars</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">
                      Budget Range: ${budgetRange[0]} - ${budgetRange[1]}
                    </label>
                    <Slider
                      min={0}
                      max={10000}
                      step={100}
                      value={budgetRange}
                      onValueChange={setBudgetRange}
                      className="mt-2"
                    />
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Results Count */}
        <div className="mb-4 text-sm text-muted-foreground">
          Showing {filteredJobs.length} of {jobs.length} jobs
        </div>

        {/* Job Listings */}
        <div className="space-y-4">
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No jobs found matching your criteria</p>
              </CardContent>
            </Card>
          ) : (
            filteredJobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={() => handleApplyClick(job)}
              />
            ))
          )}
        </div>
      </main>

      {/* Application Dialog */}
      {selectedJob && (
        <JobApplicationDialog
          open={applicationDialogOpen}
          onOpenChange={setApplicationDialogOpen}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          companyName={selectedJob.companyName}
        />
      )}

      {/* Job Alerts Dialog */}
      <JobAlertsDialog
        open={jobAlertsDialogOpen}
        onOpenChange={setJobAlertsDialogOpen}
      />

      {/* Save Search Dialog */}
      <Dialog open={showSaveSearch} onOpenChange={setShowSaveSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>
              Save your current search filters for quick access later
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Name</Label>
              <Input
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="e.g., Remote Design Jobs"
              />
            </div>
            <Button onClick={saveCurrentSearch} className="w-full">
              Save Search
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobBoard;
