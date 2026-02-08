import { useEffect, useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import Header from "@/components/Header";
import { Search, SlidersHorizontal, Bell, Bookmark, ChevronLeft, ChevronRight, Briefcase } from "lucide-react";
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
  <div className="space-y-3">
    {[...Array(4)].map((_, i) => (
      <Card key={i}>
        <CardContent className="p-4 md:p-6 space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-12 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-5 w-14" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-12" />
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

const EmptyState = ({ onClearFilters }: { onClearFilters: () => void }) => (
  <Card className="border-dashed">
    <CardContent className="py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
        <Briefcase className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-1">No jobs match your filters</h3>
      <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
        Try broadening your search or clearing filters. New roles are added daily.
      </p>
      <Button variant="outline" onClick={onClearFilters}>
        Clear all filters
      </Button>
    </CardContent>
  </Card>
);

const JobBoard = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("all");
  const [selectedType, setSelectedType] = useState("all");
  const [budgetRange, setBudgetRange] = useState([0, 10000]);
  const [showFilters, setShowFilters] = useState(false);

  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showSaveSearch, setShowSaveSearch] = useState(false);
  const [searchName, setSearchName] = useState("");

  const [applicationDialogOpen, setApplicationDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<{ id: string; title: string; companyName: string } | null>(null);
  const [jobAlertsDialogOpen, setJobAlertsDialogOpen] = useState(false);

  // Use a ref to track the latest fetch to prevent race conditions
  const fetchIdRef = useRef(0);

  const fetchJobs = useCallback(async (currentPage: number) => {
    const fetchId = ++fetchIdRef.current;
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from("jobs")
        .select("*", { count: "exact" })
        .eq("status", "open");

      if (searchQuery.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,company_name.ilike.%${searchQuery}%`
        );
      }

      if (selectedType === "remote") {
        query = query.eq("remote", true);
      } else if (selectedType === "on-site") {
        query = query.eq("remote", false);
      }

      if (budgetRange[0] > 0) {
        query = query.gte("budget_min", budgetRange[0]);
      }
      if (budgetRange[1] < 10000) {
        query = query.lte("budget_max", budgetRange[1]);
      }

      if (selectedLocation !== "all") {
        query = query.ilike("location", `%${selectedLocation}%`);
      }

      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      const { data, error: queryError, count } = await query
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false })
        .range(from, to);

      // Only update state if this is still the latest fetch
      if (fetchId !== fetchIdRef.current) return;

      if (queryError) throw queryError;

      setJobs(data || []);
      setTotalCount(count || 0);
    } catch (err) {
      if (fetchId !== fetchIdRef.current) return;
      console.error("Error fetching jobs:", err);
      setError("Unable to load jobs right now. Please try again.");
      setJobs([]);
      setTotalCount(0);
    } finally {
      if (fetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  }, [searchQuery, selectedLocation, selectedType, budgetRange]);

  // Debounced fetch on filter changes — resets to page 0
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(0);
      fetchJobs(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedLocation, selectedType, budgetRange]);

  // Fetch on page change only (not on initial mount — handled by filter effect)
  const isFirstMount = useRef(true);
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchJobs(page);
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
    const filters = { searchQuery, selectedLocation, selectedType, budgetRange };
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
  };

  const handleApplyClick = (job: Job) => {
    setSelectedJob({ id: job.id, title: job.title, companyName: job.company_name || "Company" });
    setApplicationDialogOpen(true);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("all");
    setSelectedType("all");
    setBudgetRange([0, 10000]);
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const hasActiveFilters = searchQuery || selectedLocation !== "all" || selectedType !== "all" || budgetRange[0] > 0 || budgetRange[1] < 10000;

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Job Board</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {loading ? "Loading opportunities…" : `${totalCount.toLocaleString()} verified opportunities`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setJobAlertsDialogOpen(true)} variant="outline" size="sm" className="gap-1.5">
                <Bell className="h-4 w-4" />
                <span className="hidden sm:inline">Alerts</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowSaveSearch(true)} className="gap-1.5">
                <Bookmark className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </Button>
              {savedSearches.length > 0 && (
                <Select onValueChange={(id) => {
                  const search = savedSearches.find(s => s.id === id);
                  if (search) loadSavedSearch(search);
                }}>
                  <SelectTrigger className="w-[140px] h-9 text-sm">
                    <SelectValue placeholder="Saved" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedSearches.map((search) => (
                      <SelectItem key={search.id} value={search.id}>{search.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="mb-6 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by title, skills, or company…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-card"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-1.5"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <Card>
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">Location</label>
                    <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                      <SelectTrigger><SelectValue placeholder="All Locations" /></SelectTrigger>
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
                      <SelectTrigger><SelectValue placeholder="All Types" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="remote">Remote</SelectItem>
                        <SelectItem value="on-site">On-site</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1.5 block">
                      Budget: ${budgetRange[0].toLocaleString()} – ${budgetRange[1].toLocaleString()}
                    </label>
                    <Slider min={0} max={10000} step={100} value={budgetRange} onValueChange={setBudgetRange} className="mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Results header */}
        {!loading && !error && totalPages > 1 && (
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Page {page + 1} of {totalPages}</span>
            <span>{jobs.length} of {totalCount.toLocaleString()} jobs</span>
          </div>
        )}

        {/* Error state */}
        {error && !loading && (
          <Card className="border-destructive/50">
            <CardContent className="py-12 text-center">
              <p className="text-destructive font-medium mb-2">{error}</p>
              <Button variant="outline" onClick={() => fetchJobs(page)}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* Job Listings */}
        {loading ? (
          <JobBoardSkeleton />
        ) : !error && jobs.length === 0 ? (
          <EmptyState onClearFilters={clearFilters} />
        ) : !error && (
          <div className="space-y-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} onApply={() => handleApplyClick(job)} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && !loading && !error && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i;
                else if (page < 3) pageNum = i;
                else if (page > totalPages - 4) pageNum = totalPages - 5 + i;
                else pageNum = page - 2 + i;
                return (
                  <Button
                    key={pageNum}
                    variant={page === pageNum ? "default" : "outline"}
                    size="sm"
                    className="w-9 h-9"
                    onClick={() => setPage(pageNum)}
                  >
                    {pageNum + 1}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline" size="sm"
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
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

      <JobAlertsDialog open={jobAlertsDialogOpen} onOpenChange={setJobAlertsDialogOpen} />

      <Dialog open={showSaveSearch} onOpenChange={setShowSaveSearch}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Search</DialogTitle>
            <DialogDescription>Save your current search filters for quick access later</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Search Name</Label>
              <Input value={searchName} onChange={(e) => setSearchName(e.target.value)} placeholder="e.g., Remote Design Jobs" />
            </div>
            <Button onClick={saveCurrentSearch} className="w-full">Save Search</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default JobBoard;
