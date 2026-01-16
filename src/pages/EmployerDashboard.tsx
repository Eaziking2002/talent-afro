import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { Briefcase, Eye, Users, MessageSquare, CheckCircle, XCircle } from "lucide-react";

interface Job {
  id: string;
  title: string;
  status: string;
  created_at: string;
  budget_min: number;
  budget_max: number;
}

interface Application {
  id: string;
  proposal_text: string;
  status: string;
  created_at: string;
  job_id: string;
  applicant_id: string;
  applicant: {
    full_name: string;
    skills: any;
    rating: number;
  };
  job: {
    title: string;
  };
}

const EmployerDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [employerId, setEmployerId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchEmployerData();
  }, [user]);

  const fetchEmployerData = async () => {
    if (!user) return;

    try {
      // Get employer profile
      const { data: employer, error: employerError } = await supabase
        .from("employers")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (employerError) {
        toast({
          title: "No Employer Profile",
          description: "Please create an employer profile first",
          variant: "destructive",
        });
        navigate("/profile-setup");
        return;
      }

      setEmployerId(employer.id);

      // Get jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from("jobs")
        .select("*")
        .eq("employer_id", employer.id)
        .order("created_at", { ascending: false });

      if (jobsError) throw jobsError;
      setJobs(jobsData || []);

      // Get applications for all jobs - no longer select email from profiles
      const { data: applicationsData, error: appsError } = await supabase
        .from("applications")
        .select(`
          *,
          applicant:profiles!applications_applicant_id_fkey(full_name, skills, rating),
          job:jobs(title)
        `)
        .in("job_id", (jobsData || []).map(j => j.id))
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;
      setApplications(applicationsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateApplicationStatus = async (applicationId: string, newStatus: "pending" | "accepted" | "rejected" | "completed") => {
    try {
      // Get application details for notification
      const app = applications.find(a => a.id === applicationId);
      
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", applicationId);

      if (error) throw error;

      // Send notification to the applicant
      if (app) {
        const { data: applicantProfile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id", app.applicant_id)
          .single();

        if (applicantProfile) {
          await supabase.from("notifications").insert({
            user_id: applicantProfile.user_id,
            type: "application_update",
            title: newStatus === "accepted" 
              ? "🎉 Application Accepted!" 
              : newStatus === "rejected"
              ? "Application Update"
              : "Application Status Changed",
            description: newStatus === "accepted"
              ? `Congratulations! Your application for "${app.job.title}" has been accepted.`
              : newStatus === "rejected"
              ? `Your application for "${app.job.title}" was not selected this time.`
              : `Your application for "${app.job.title}" status changed to ${newStatus}.`,
            related_id: applicationId,
            related_type: "application",
            metadata: { status: newStatus, job_title: app.job.title }
          });
        }
      }

      toast({
        title: "Success",
        description: `Application ${newStatus}`,
      });

      fetchEmployerData();
    } catch (error) {
      console.error("Error updating application:", error);
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive",
      });
    }
  };

  const startConversation = (applicantId: string, applicationId: string) => {
    navigate(`/messages?recipient=${applicantId}&application=${applicationId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const pendingApps = applications.filter(a => a.status === "pending");
  const activeJobs = jobs.filter(j => j.status === "open");

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Employer Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Manage your job postings and review applications
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeJobs.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApps.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{applications.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Jobs</CardTitle>
              <Briefcase className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{jobs.length}</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="jobs">My Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="applications" className="space-y-4">
            {applications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No applications yet
                </CardContent>
              </Card>
            ) : (
              applications.map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{app.applicant.full_name}</CardTitle>
                        <CardDescription>{app.job.title}</CardDescription>
                        <div className="flex gap-2 flex-wrap mt-2">
                          {(Array.isArray(app.applicant.skills) ? app.applicant.skills : []).map((skill: string) => (
                            <Badge key={skill} variant="secondary">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant={
                          app.status === "pending" ? "outline" :
                          app.status === "accepted" ? "default" : "destructive"
                        }>
                          {app.status}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {new Date(app.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <p className="text-sm font-medium mb-2">Proposal:</p>
                      <p className="text-sm text-muted-foreground">{app.proposal_text}</p>
                    </div>
                    {app.status === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => updateApplicationStatus(app.id, "accepted")}
                          className="gap-2"
                        >
                          <CheckCircle className="h-4 w-4" />
                          Accept
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => updateApplicationStatus(app.id, "rejected")}
                          className="gap-2"
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startConversation(app.applicant_id, app.id)}
                          className="gap-2"
                        >
                          <MessageSquare className="h-4 w-4" />
                          Message
                        </Button>
                      </div>
                    )}
                    {app.status !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => startConversation(app.applicant_id, app.id)}
                        className="gap-2"
                      >
                        <MessageSquare className="h-4 w-4" />
                        Message Candidate
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="jobs" className="space-y-4">
            {jobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground mb-4">No jobs posted yet</p>
                  <Button onClick={() => navigate("/jobs")}>Post a Job</Button>
                </CardContent>
              </Card>
            ) : (
              jobs.map((job) => (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{job.title}</CardTitle>
                        <CardDescription>
                          ${job.budget_min} - ${job.budget_max}
                        </CardDescription>
                      </div>
                      <Badge variant={job.status === "open" ? "default" : "secondary"}>
                        {job.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-4 text-sm text-muted-foreground">
                      <span>Posted {new Date(job.created_at).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>
                        {applications.filter(a => a.job_id === job.id).length} applications
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default EmployerDashboard;