import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { Eye, Users, TrendingUp, Clock, MapPin, DollarSign } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface JobStats {
  job_id: string;
  job_title: string;
  total_views: number;
  total_applications: number;
  pending_applications: number;
  accepted_applications: number;
  rejected_applications: number;
  budget_min: number;
  budget_max: number;
  location: string;
  created_at: string;
}

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1"];

const EmployerAnalytics = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobStats, setJobStats] = useState<JobStats[]>([]);
  const [totalViews, setTotalViews] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAnalytics();
  }, [user]);

  const fetchAnalytics = async () => {
    if (!user) return;

    try {
      // Get employer profile
      const { data: employer } = await supabase
        .from("employers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!employer) {
        toast({
          title: "Employer Profile Required",
          description: "Please complete your employer profile first",
          variant: "destructive",
        });
        return;
      }

      // Get jobs with their stats
      const { data: jobs, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("employer_id", employer.id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;

      const stats: JobStats[] = [];
      let views = 0;
      let apps = 0;

      for (const job of jobs || []) {
        // Get view count
        const { count: viewCount } = await supabase
          .from("job_views")
          .select("*", { count: "exact", head: true })
          .eq("job_id", job.id);

        // Get application stats
        const { data: applications } = await supabase
          .from("applications")
          .select("status")
          .eq("job_id", job.id);

        const totalApps = applications?.length || 0;
        const pending = applications?.filter(a => a.status === "pending").length || 0;
        const accepted = applications?.filter(a => a.status === "accepted").length || 0;
        const rejected = applications?.filter(a => a.status === "rejected").length || 0;

        views += viewCount || 0;
        apps += totalApps;

        stats.push({
          job_id: job.id,
          job_title: job.title,
          total_views: viewCount || 0,
          total_applications: totalApps,
          pending_applications: pending,
          accepted_applications: accepted,
          rejected_applications: rejected,
          budget_min: job.budget_min,
          budget_max: job.budget_max,
          location: job.location || "Remote",
          created_at: job.created_at,
        });
      }

      setJobStats(stats);
      setTotalViews(views);
      setTotalApplications(apps);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applicationStatusData = jobStats.reduce((acc, job) => {
    return [
      { name: "Pending", value: (acc.find(d => d.name === "Pending")?.value || 0) + job.pending_applications },
      { name: "Accepted", value: (acc.find(d => d.name === "Accepted")?.value || 0) + job.accepted_applications },
      { name: "Rejected", value: (acc.find(d => d.name === "Rejected")?.value || 0) + job.rejected_applications },
    ];
  }, [] as { name: string; value: number }[]).filter(d => d.value > 0);

  const topJobsData = jobStats
    .sort((a, b) => b.total_applications - a.total_applications)
    .slice(0, 5)
    .map(job => ({
      name: job.job_title.length > 20 ? job.job_title.substring(0, 20) + "..." : job.job_title,
      applications: job.total_applications,
      views: job.total_views,
    }));

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Track performance of your job postings
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobStats.length}</div>
              <p className="text-xs text-muted-foreground">Active job postings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalViews}</div>
              <p className="text-xs text-muted-foreground">Across all jobs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalApplications}</div>
              <p className="text-xs text-muted-foreground">From all candidates</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Applications</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {jobStats.length > 0 ? (totalApplications / jobStats.length).toFixed(1) : 0}
              </div>
              <p className="text-xs text-muted-foreground">Per job posting</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Jobs</CardTitle>
              <CardDescription>Applications and views by job</CardDescription>
            </CardHeader>
            <CardContent>
              {topJobsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topJobsData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="applications" fill="#10b981" name="Applications" />
                    <Bar dataKey="views" fill="#6366f1" name="Views" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Application Status</CardTitle>
              <CardDescription>Distribution of application statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {applicationStatusData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={applicationStatusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {applicationStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No applications yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Job Details Table */}
        <Card>
          <CardHeader>
            <CardTitle>Job Performance Details</CardTitle>
            <CardDescription>Detailed metrics for each job posting</CardDescription>
          </CardHeader>
          <CardContent>
            {jobStats.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                No job postings yet
              </div>
            ) : (
              <div className="space-y-4">
                {jobStats.map((job) => (
                  <Card key={job.job_id} className="border-l-4 border-l-primary">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">{job.job_title}</CardTitle>
                          <CardDescription className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3" />
                              {job.location}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <DollarSign className="h-3 w-3" />
                              ${job.budget_min} - ${job.budget_max}
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Clock className="h-3 w-3" />
                              Posted {new Date(job.created_at).toLocaleDateString()}
                            </div>
                          </CardDescription>
                        </div>
                        <div className="flex flex-col gap-2">
                          <div className="flex gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Eye className="h-3 w-3" />
                              {job.total_views} views
                            </Badge>
                            <Badge variant="outline" className="gap-1">
                              <Users className="h-3 w-3" />
                              {job.total_applications} applications
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-yellow-600">
                            {job.pending_applications}
                          </p>
                          <p className="text-xs text-muted-foreground">Pending</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-green-600">
                            {job.accepted_applications}
                          </p>
                          <p className="text-xs text-muted-foreground">Accepted</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-2xl font-bold text-red-600">
                            {job.rejected_applications}
                          </p>
                          <p className="text-xs text-muted-foreground">Rejected</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default EmployerAnalytics;