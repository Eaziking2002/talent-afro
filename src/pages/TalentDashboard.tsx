import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { Briefcase, Bookmark, Bell, ExternalLink, Trash2, Clock, CheckCircle, XCircle, FileBox } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { JobAlertsDialog } from "@/components/JobAlertsDialog";
import JobRecommendations from "@/components/JobRecommendations";
import { PortfolioUpload } from "@/components/PortfolioUpload";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { ContractManager } from "@/components/ContractManager";
import type { Json } from "@/integrations/supabase/types";

interface Application {
  id: string;
  job_id: string;
  proposal_text: string;
  status: string;
  created_at: string;
  jobs: {
    title: string;
    company_name: string;
    budget_min: number;
    budget_max: number;
    location: string;
    external_url: string;
  };
}

interface Bookmark {
  id: string;
  job_id: string;
  notes: string | null;
  created_at: string;
  jobs: {
    title: string;
    company_name: string;
    budget_min: number;
    budget_max: number;
    location: string;
    required_skills: Json;
    external_url: string;
    status: string;
  };
}

const TalentDashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [jobAlertsDialogOpen, setJobAlertsDialogOpen] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    // Avoid redirecting while auth is still restoring the session.
    if (authLoading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    fetchDashboardData();
  }, [authLoading, user, navigate]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Get user's profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        navigate("/profile-setup");
        return;
      }

      setProfileId(profile.id);

      // Fetch applications
      const { data: apps, error: appsError } = await supabase
        .from("applications")
        .select(`
          id,
          job_id,
          proposal_text,
          status,
          created_at,
          jobs (
            title,
            company_name,
            budget_min,
            budget_max,
            location,
            external_url
          )
        `)
        .eq("applicant_id", profile.id)
        .order("created_at", { ascending: false });

      if (appsError) throw appsError;
      setApplications(apps || []);

      // Fetch bookmarks
      const { data: marks, error: marksError } = await supabase
        .from("job_bookmarks")
        .select(`
          id,
          job_id,
          notes,
          created_at,
          jobs (
            title,
            company_name,
            budget_min,
            budget_max,
            location,
            required_skills,
            external_url,
            status
          )
        `)
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: false });

      if (marksError) throw marksError;
      setBookmarks(marks || []);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from("job_bookmarks")
        .delete()
        .eq("id", bookmarkId);

      if (error) throw error;

      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
      toast({
        title: "Bookmark Removed",
        description: "Job removed from your saved list",
      });
    } catch (error) {
      console.error("Error deleting bookmark:", error);
      toast({
        title: "Error",
        description: "Failed to remove bookmark",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case "accepted":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="gap-1">{getStatusIcon(status)} Pending</Badge>;
      case "accepted":
        return <Badge className="gap-1 bg-green-500">{getStatusIcon(status)} Accepted</Badge>;
      case "rejected":
        return <Badge variant="destructive" className="gap-1">{getStatusIcon(status)} Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">My Dashboard</h1>
          <p className="text-lg text-muted-foreground">
            Track your applications, saved jobs, and job alerts
          </p>
        </div>

        {/* AI Recommendations */}
        <div className="mb-8">
          <JobRecommendations />
        </div>

        <Tabs defaultValue="applications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto">
            <TabsTrigger value="applications" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Applications ({applications.length})
            </TabsTrigger>
            <TabsTrigger value="bookmarks" className="gap-2">
              <Bookmark className="h-4 w-4" />
              Saved Jobs ({bookmarks.length})
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-2">
              <Bell className="h-4 w-4" />
              Job Alerts
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="gap-2">
              <FileBox className="h-4 w-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="contracts" className="gap-2">
              <FileBox className="h-4 w-4" />
              Contracts
            </TabsTrigger>
          </TabsList>

          {/* Applications Tab */}
          <TabsContent value="applications" className="space-y-4">
            {applications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No applications yet</p>
                  <Button onClick={() => navigate("/jobs")}>Browse Jobs</Button>
                </CardContent>
              </Card>
            ) : (
              applications.map((app) => (
                <Card key={app.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{app.jobs.title}</CardTitle>
                        <CardDescription className="space-y-1">
                          <div>{app.jobs.company_name}</div>
                          <div className="text-sm">
                            ${app.jobs.budget_min} - ${app.jobs.budget_max} • {app.jobs.location}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {getStatusBadge(app.status)}
                        <p className="text-xs text-muted-foreground">
                          Applied {new Date(app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div>
                        <p className="text-sm font-medium mb-1">Your Proposal:</p>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {app.proposal_text}
                        </p>
                      </div>
                      {app.jobs.external_url && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={app.jobs.external_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View Original Posting
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Bookmarks Tab */}
          <TabsContent value="bookmarks" className="space-y-4">
            {bookmarks.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bookmark className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">No saved jobs yet</p>
                  <Button onClick={() => navigate("/jobs")}>Browse Jobs</Button>
                </CardContent>
              </Card>
            ) : (
              bookmarks.map((bookmark) => (
                <Card key={bookmark.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <CardTitle className="text-xl mb-2">{bookmark.jobs.title}</CardTitle>
                        <CardDescription className="space-y-1">
                          <div>{bookmark.jobs.company_name}</div>
                          <div className="text-sm">
                            ${bookmark.jobs.budget_min} - ${bookmark.jobs.budget_max} • {bookmark.jobs.location}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {bookmark.jobs.status !== "open" && (
                          <Badge variant="outline">Closed</Badge>
                        )}
                        <p className="text-xs text-muted-foreground">
                          Saved {new Date(bookmark.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {bookmark.notes && (
                        <div>
                          <p className="text-sm font-medium mb-1">Your Notes:</p>
                          <p className="text-sm text-muted-foreground">{bookmark.notes}</p>
                        </div>
                      )}
                      <div className="flex gap-2">
                        {bookmark.jobs.status === "open" && (
                          <Button onClick={() => navigate("/jobs")}>
                            Apply Now
                          </Button>
                        )}
                        {bookmark.jobs.external_url && (
                          <Button variant="outline" asChild>
                            <a href={bookmark.jobs.external_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View Job
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteBookmark(bookmark.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Job Alerts Tab */}
          <TabsContent value="alerts">
            <Card>
              <CardHeader>
                <CardTitle>Job Alert Settings</CardTitle>
                <CardDescription>
                  Manage your email notifications for new job opportunities
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setJobAlertsDialogOpen(true)} className="gap-2">
                  <Bell className="h-4 w-4" />
                  Configure Job Alerts
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Portfolio Tab */}
          <TabsContent value="portfolio" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">My Portfolio</h2>
              {profileId && <PortfolioUpload profileId={profileId} onUploadComplete={fetchDashboardData} />}
            </div>
            {profileId && <PortfolioGallery profileId={profileId} isOwner={true} />}
          </TabsContent>

          {/* Contracts Tab */}
          <TabsContent value="contracts">
            <ContractManager />
          </TabsContent>
        </Tabs>
      </main>

      <JobAlertsDialog
        open={jobAlertsDialogOpen}
        onOpenChange={setJobAlertsDialogOpen}
      />
    </div>
  );
};

export default TalentDashboard;