import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { EmployerProfileHeader, EmployerHeaderSkeleton } from "@/components/profile/EmployerProfileHeader";
import { ProfileReviews } from "@/components/profile/ProfileReviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Briefcase, Users, Settings, DollarSign } from "lucide-react";

const EmployerProfile = () => {
  const { employerId: paramEmployerId } = useParams<{ employerId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [employer, setEmployer] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [isOwner, setIsOwner] = useState(false);

  const fetchEmployer = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase.from("employers").select("*");

      if (paramEmployerId) {
        query = query.eq("id", paramEmployerId);
      } else if (user) {
        query = query.eq("user_id", user.id);
      } else {
        setLoading(false);
        return;
      }

      const { data, error } = await query.maybeSingle();
      if (error) throw error;

      if (!data) {
        if (!paramEmployerId && user) {
          navigate("/profile-setup");
        } else {
          toast.error("Company not found");
          navigate("/");
        }
        return;
      }

      setEmployer(data);
      setIsOwner(!!user && data.user_id === user.id);

      // Fetch jobs
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("id, title, status, budget_min, budget_max, location, created_at")
        .eq("employer_id", data.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setJobs(jobsData || []);
    } catch (err: any) {
      console.error("Employer load error:", err);
      toast.error("Failed to load company profile");
    } finally {
      setLoading(false);
    }
  }, [paramEmployerId, user, navigate]);

  useEffect(() => {
    fetchEmployer();
  }, [fetchEmployer]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
          <EmployerHeaderSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-64 rounded-xl" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!employer) return null;

  const activeJobs = jobs.filter((j) => j.status === "open");
  const closedJobs = jobs.filter((j) => j.status !== "open");

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {isOwner && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Company Profile</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/profile-setup")}>
                <Settings className="h-4 w-4" /> Edit Profile
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/wallet")}>
                <DollarSign className="h-4 w-4" /> Wallet
              </Button>
            </div>
          </div>
        )}

        <EmployerProfileHeader
          employer={employer}
          isOwner={isOwner}
          onContact={() => navigate(`/messages?recipient=${employer.user_id}`)}
          onPostJob={() => navigate("/jobs")}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Active jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-muted-foreground" />
                  Active Job Listings ({activeJobs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activeJobs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No active jobs right now</p>
                ) : (
                  <div className="space-y-3">
                    {activeJobs.map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                        <div>
                          <p className="font-medium text-sm">{job.title}</p>
                          <p className="text-xs text-muted-foreground">
                            ${job.budget_min} – ${job.budget_max} · {job.location || "Remote"}
                          </p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/jobs?job=${job.id}`)}>
                          View
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Past jobs */}
            {closedJobs.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Past Listings ({closedJobs.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {closedJobs.slice(0, 5).map((job) => (
                      <div key={job.id} className="flex items-center justify-between p-2.5 rounded-lg border text-sm">
                        <span className="truncate">{job.title}</span>
                        <Badge variant="outline" className="text-xs capitalize">{job.status}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Company Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileReviews revieweeId={employer.user_id} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Company Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Jobs Posted</span>
                  <span className="font-medium">{employer.total_jobs_posted ?? jobs.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Successful Hires</span>
                  <span className="font-medium">{employer.successful_hires ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium">
                    {employer.average_rating ? `${Number(employer.average_rating).toFixed(1)} ⭐` : "No ratings"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-medium">{new Date(employer.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Verification</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Business</span>
                  {employer.verified ? (
                    <Badge variant="secondary" className="text-xs">Verified ✓</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Level</span>
                  <Badge variant="outline" className="text-xs capitalize">{employer.verification_level || "Basic"}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default EmployerProfile;
