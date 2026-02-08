import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Header from "@/components/Header";
import { Search, Filter, Bell, Bookmark, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { Json } from "@/integrations/supabase/types";
import { JobApplicationDialog } from "@/components/JobApplicationDialog";
import { JobAlertsDialog } from "@/components/JobAlertsDialog";
import { JobCard } from "@/components/JobCard";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

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
  } | null;
}

const PAGE_SIZE = 20;

const JobBoardSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <Card key={i}>
        <CardContent className="p-6 space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-8 w-28" />
          </div>
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" />
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-14" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const JobBoard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [budgetRange, setBudgetRange] = useState([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);
  const [ratingFilter, setRatingFilter] = useState("0");

  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [searchName, setSearchName] = useState("");

  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string; companyName: string } | null>(null);
  const [jobAlertsDialogOpen, setJobAlertsDialogOpen] = useState(false);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      // Build query with filters applied server-side
      let query = supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("status", "open");

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`
        );
      }

      // Apply type filter
      if (selectedType === "remote") {
        query = query.eq("remote", true);
      } else if (selectedType === "on-site") {
        query = query.eq("remote", false);
      }

      // Apply budget filter
      if (budgetRange[0] > 0) {
        query = query.gte("budget_min", budgetRange[0]);
      }
      if (budgetRange[1] < 10000) {
        query = query.lte("budget_max", budgetRange[1]);
      }

      // Apply location filter
      if (selectedLocation !== "all") {
        query = query.ilike("location", `%${selectedLocation}%`);
      }

      // Order and paginate
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error, count } = await query
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (error) throw error;

      setJobs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching jobs:", error);
      toast({
        title: "Error",
        description: "Failed to load jobs. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, selectedLocation, selectedType, budgetRange]);

  // Debounced fetch on filter changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchJobs();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocation, selectedType, budgetRange, ratingFilter]);

  // Fetch on page change
  useEffect(() => {
    fetchJobs();
  }, [page]);

  // Fetch saved searches once
  useEffect(() => {
    fetchSavedSearches();
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
    const filters = { searchQuery, selectedLocation, selectedType, budgetRange, ratingFilter };
    const { error } = await supabase.from("saved_searches").insert({ user_id: user.id, name: searchName, filters });
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

  const handleApplyClick = (job: Job) => {
    setSelectedJob({
      id: job.id,
      title: job.title,
      companyName: job.company_name || "Company",
    });
    setApplicationDialogOpen(true);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        {/* Hero Section */}
        <div className="mb-6 text-center">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">Find Your Next Opportunity</h1>
          <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
            <Button onClick={() => setJobAlertsDialogOpen(true)} variant="outline" size="sm" className="gap-1.5">
              <Bell className="h-4 w-4" />
              Job Alerts
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowSaveSearch(true)}>
              <Bookmark className="h-4 w-4 mr-1.5" />
              Save Search
            </Button>
            {savedSearches.length > 0 && (
              <Select onValueChange={(id) => {
                const search = savedSearches.find(s => s.id === id);
                if (search) loadSavedSearch(search);
              }}>
                <SelectTrigger className="w-[160px] h-9 text-sm">
                  <SelectValue placeholder="Saved searches" />
                </SelectTrigger>
                <SelectContent>
                  {savedSearches.map((search) => (
                    <SelectItem key={search.id} value={search.id}>{search.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          <p className="text-sm md:text-base text-muted-foreground">
            Browse {totalCount.toLocaleString()} verified job opportunities across Africa and worldwide
          </p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="pt-5 pb-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search jobs by title, skills, or company..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11"
                />
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-1.5" />
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Locations" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        <SelectItem value="Remote">Remote</SelectItem>
                        <SelectItem value="Nigeria">Nigeria</SelectItem>
                        <SelectItem value="Kenya">Kenya</SelectItem>
                        <SelectItem value="South Africa">South Africa</SelectItem>
                        <SelectItem value="Ghana">Ghana</SelectItem>
                        <SelectItem value="Sierra Leone">Sierra Leone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Job Type</label>
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
                    <label className="text-sm font-medium mb-1.5 block">
                      Budget: ${budgetRange[0]} - ${budgetRange[1]}
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

        {/* Results Count + Pagination Info */}
        <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {loading ? "Loading..." : `Showing ${jobs.length} of ${totalCount.toLocaleString()} jobs`}
          </span>
          {totalPages > 1 && (
            <span>Page {page + 1} of {totalPages}</span>
          )}
        </div>

        {/* Job Listings */}
        {loading ? (
          <JobBoardSkeleton />
        ) : jobs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">No jobs found matching your criteria</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedLocation("all");
                  setSelectedType("all");
                  setBudgetRange([0, 10000]);
                  setRatingFilter("0");
                }}
              >
                Clear all filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={() => handleApplyClick(job)}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i;
                } else if (page < 3) {
                  pageNum = i;
                } else if (page > totalPages - 4) {
                  pageNum = totalPages - 5 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-9 h-9"
                    onClick={() => setPage(pageNum)}
                    disabled={loading}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1 || loading}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </main>

      {selectedJob && (
        <JobApplicationDialog
          open={applicationDialogOpen}
          onOpenChange={setApplicationDialogOpen}
          jobId={selectedJob.id}
          jobTitle={selectedJob.title}
          companyName={selectedJob.companyName}
        />
      )}

      <JobAlertsDialog
        open={jobAlertsDialogOpen}
        onOpenChange={setJobAlertsDialogOpen}
      />

      <Dialog open={showSaveSearch} onOpenChange={setShowSaveSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>Save your current search filters for quick access later</DialogDescription>
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
            <Button onClick={saveCurrentSearch} className="w-full">Save Search</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobBoard;
