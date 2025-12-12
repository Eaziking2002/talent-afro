import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { toast } from "@/hooks/use-toast";
import {
  CheckCircle,
  XCircle,
  Star,
  TrendingUp,
  AlertCircle,
  RefreshCw,
  Calendar,
  Loader2,
} from "lucide-react";

interface Job {
  id: string;
  title: string;
  company_name: string | null;
  description: string;
  budget_min: number;
  budget_max: number;
  status: string;
  is_featured: boolean;
  ai_scraped: boolean;
  external_url: string | null;
  verification_status: string;
  featured_until: string | null;
  created_at: string;
  employers?: { company_name: string };
}

interface ScrapingLog {
  id: string;
  created_at: string;
  jobs_found: number;
  jobs_created: number;
  jobs_rejected: number;
  error_message: string | null;
  execution_time_ms: number;
  status: string;
}

const AdminJobManagement = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [scrapingLogs, setScrapingLogs] = useState<ScrapingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [featuredDays, setFeaturedDays] = useState("7");
  const [isRunningScraper, setIsRunningScraper] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      checkAdminStatus();
    }
  }, [user]);

  const checkAdminStatus = async () => {
    try {
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user!.id,
        _role: "admin",
      });

      if (error) throw error;

      setIsAdmin(data);

      if (!data) {
        toast({
          title: "Access Denied",
          description: "You need admin privileges to access this page",
          variant: "destructive",
        });
        navigate("/");
      } else {
        fetchJobs();
        fetchScrapingLogs();
      }
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const fetchJobs = async () => {
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select(`
          *,
          employers (company_name)
        `)
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
    }
  };

  const fetchScrapingLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("job_scraping_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      setScrapingLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const updateJobVerification = async (jobId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("jobs")
        .update({ verification_status: status })
        .eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Job ${status}`,
      });

      fetchJobs();
    } catch (error) {
      console.error("Error updating job:", error);
      toast({
        title: "Error",
        description: "Failed to update job",
        variant: "destructive",
      });
    }
  };

  const toggleFeatured = async (jobId: string, currentlyFeatured: boolean) => {
    try {
      const updates: any = { is_featured: !currentlyFeatured };

      if (!currentlyFeatured) {
        const days = parseInt(featuredDays) || 7;
        const featuredUntil = new Date();
        featuredUntil.setDate(featuredUntil.getDate() + days);
        updates.featured_until = featuredUntil.toISOString();
      } else {
        updates.featured_until = null;
      }

      const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);

      if (error) throw error;

      toast({
        title: "Success",
        description: currentlyFeatured ? "Job unfeatured" : `Job featured for ${featuredDays} days`,
      });

      fetchJobs();
      setSelectedJob(null);
    } catch (error) {
      console.error("Error toggling featured:", error);
      toast({
        title: "Error",
        description: "Failed to update featured status",
        variant: "destructive",
      });
    }
  };

  const runScraper = async () => {
    setIsRunningScraper(true);
    try {
      const { data, error } = await supabase.functions.invoke("job-aggregator");

      if (error) throw error;

      toast({
        title: "Job Aggregator Complete",
        description: `Fetched ${data.total_fetched || 0} jobs, created ${data.jobs_created || 0} new jobs`,
      });

      fetchJobs();
      fetchScrapingLogs();
    } catch (error) {
      console.error("Error running job aggregator:", error);
      toast({
        title: "Aggregator Failed",
        description: error instanceof Error ? error.message : "Failed to fetch jobs",
        variant: "destructive",
      });
    } finally {
      setIsRunningScraper(false);
    }
  };

  const getCompanyName = (job: Job) => {
    return job.company_name || job.employers?.company_name || "Unknown";
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const unverifiedJobs = jobs.filter((j) => j.verification_status === "unverified");
  const verifiedJobs = jobs.filter((j) => j.verification_status === "verified");
  const featuredJobs = jobs.filter((j) => j.is_featured);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Job Management Dashboard</h1>
          <p className="text-muted-foreground">Manage AI-scraped jobs and featured listings</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unverified</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{unverifiedJobs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Verified</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{verifiedJobs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Featured</CardTitle>
              <Star className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{featuredJobs.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Job Aggregator Controls */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Job Aggregator</CardTitle>
            <CardDescription>Fetch jobs from free APIs (Remotive, Adzuna, JSearch)</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={runScraper}
              disabled={isRunningScraper}
              className="gap-2"
            >
              {isRunningScraper ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isRunningScraper ? "Fetching Jobs..." : "Fetch Jobs Now"}
            </Button>
          </CardContent>
        </Card>

        {/* Job Management Tabs */}
        <Tabs defaultValue="unverified">
          <TabsList>
            <TabsTrigger value="unverified">
              Unverified ({unverifiedJobs.length})
            </TabsTrigger>
            <TabsTrigger value="verified">Verified ({verifiedJobs.length})</TabsTrigger>
            <TabsTrigger value="featured">Featured ({featuredJobs.length})</TabsTrigger>
            <TabsTrigger value="logs">Scraping Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="unverified" className="space-y-4 mt-6">
            {unverifiedJobs.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No unverified jobs
                </CardContent>
              </Card>
            ) : (
              unverifiedJobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>
                          {getCompanyName(job)} • ${job.budget_min} - ${job.budget_max}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {job.ai_scraped && <Badge variant="secondary">AI Scraped</Badge>}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                      {job.description}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => updateJobVerification(job.id, "verified")}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Verify
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => updateJobVerification(job.id, "rejected")}
                        className="gap-2"
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedJob(job)}
                        className="gap-2"
                      >
                        <Star className="h-4 w-4" />
                        Feature
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="verified" className="space-y-4 mt-6">
            {verifiedJobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription>
                        {getCompanyName(job)} • ${job.budget_min} - ${job.budget_max}
                      </CardDescription>
                    </div>
                    <Badge variant="default">Verified</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedJob(job)}
                    className="gap-2"
                  >
                    <Star className="h-4 w-4" />
                    {job.is_featured ? "Manage Featured" : "Make Featured"}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="featured" className="space-y-4 mt-6">
            {featuredJobs.map((job) => (
              <Card key={job.id} className="border-primary">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{job.title}</CardTitle>
                      <CardDescription>
                        {getCompanyName(job)} • Featured until{" "}
                        {job.featured_until
                          ? new Date(job.featured_until).toLocaleDateString()
                          : "N/A"}
                      </CardDescription>
                    </div>
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Featured
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => toggleFeatured(job.id, true)}
                  >
                    Remove Featured
                  </Button>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="logs" className="space-y-4 mt-6">
            {scrapingLogs.map((log) => (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {new Date(log.created_at).toLocaleString()}
                      </CardTitle>
                      <CardDescription>
                        Execution time: {log.execution_time_ms}ms
                      </CardDescription>
                    </div>
                    <Badge
                      variant={
                        log.status === "success"
                          ? "default"
                          : log.status === "failed"
                          ? "destructive"
                          : "secondary"
                      }
                    >
                      {log.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Found</p>
                      <p className="text-xl font-bold">{log.jobs_found}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="text-xl font-bold text-green-600">{log.jobs_created}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Rejected</p>
                      <p className="text-xl font-bold text-red-600">{log.jobs_rejected}</p>
                    </div>
                  </div>
                  {log.error_message && (
                    <p className="mt-4 text-sm text-destructive">{log.error_message}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>

        {/* Feature Dialog */}
        <Dialog open={!!selectedJob} onOpenChange={() => setSelectedJob(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Feature Job</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Feature Duration (days)
                </label>
                <Input
                  type="number"
                  value={featuredDays}
                  onChange={(e) => setFeaturedDays(e.target.value)}
                  min="1"
                  max="90"
                />
              </div>
              <Button
                onClick={() =>
                  selectedJob && toggleFeatured(selectedJob.id, selectedJob.is_featured)
                }
                className="w-full gap-2"
              >
                <Calendar className="h-4 w-4" />
                {selectedJob?.is_featured ? "Update Featured" : "Make Featured"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default AdminJobManagement;
