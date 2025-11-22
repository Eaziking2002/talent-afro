import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Header from "@/components/Header";
import { Search, MapPin, Briefcase, DollarSign, Star, ExternalLink, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Job {
  id: string;
  title: string;
  company_name: string | null;
  description: string;
  location: string | null;
  budget_min: number;
  budget_max: number;
  required_skills: string[];
  remote: boolean;
  status: string;
  is_featured: boolean;
  ai_scraped: boolean;
  external_url: string | null;
  verification_status: string;
  created_at: string;
  employers?: { company_name: string };
}

const JobBoard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [budgetRange, setBudgetRange] = useState([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchJobs();

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

    return matchesSearch && matchesLocation && matchesType && matchesBudget;
  });

  const uniqueLocations = Array.from(
    new Set(jobs.map((job) => job.location).filter(Boolean))
  );

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
          <h1 className="text-4xl font-bold mb-2">Find Your Next Opportunity</h1>
          <p className="text-lg text-muted-foreground">
            Browse {jobs.length} verified job opportunities across Africa
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
              <Card
                key={job.id}
                className={`hover:shadow-lg transition-all ${
                  job.is_featured ? "border-primary border-2" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {job.is_featured && (
                          <Badge variant="default" className="gap-1">
                            <Star className="h-3 w-3 fill-current" />
                            Featured
                          </Badge>
                        )}
                        {job.ai_scraped && (
                          <Badge variant="secondary">AI Verified</Badge>
                        )}
                        {job.remote && (
                          <Badge variant="outline">Remote</Badge>
                        )}
                      </div>
                      <CardTitle className="text-2xl mb-1">{job.title}</CardTitle>
                      <CardDescription className="flex items-center gap-4 text-base">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-4 w-4" />
                          {getCompanyName(job)}
                        </span>
                        {job.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4" />
                            {job.location}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-2xl font-bold text-primary">
                        <DollarSign className="h-5 w-5" />
                        {job.budget_min} - {job.budget_max}
                      </div>
                      <p className="text-sm text-muted-foreground">USD</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground mb-4 line-clamp-3">
                    {job.description}
                  </p>

                  {job.required_skills && job.required_skills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {job.required_skills.slice(0, 6).map((skill, index) => (
                        <Badge key={index} variant="outline">
                          {skill}
                        </Badge>
                      ))}
                      {job.required_skills.length > 6 && (
                        <Badge variant="outline">+{job.required_skills.length - 6} more</Badge>
                      )}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button className="flex-1">Apply Now</Button>
                    {job.external_url && (
                      <Button variant="outline" asChild>
                        <a href={job.external_url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          View Original
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default JobBoard;
