import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Header from "@/components/Header";
import { TalentProfileHeader, ProfileHeaderSkeleton } from "@/components/profile/ProfileHeader";
import { SkillsSection, SkillsSkeleton } from "@/components/profile/SkillsSection";
import { WorkExperienceSection, WorkExperienceSkeleton } from "@/components/profile/WorkExperienceSection";
import { EducationSection, EducationSkeleton } from "@/components/profile/EducationSection";
import { AIRecommendationsWidget } from "@/components/profile/AIRecommendationsWidget";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { PortfolioUpload } from "@/components/PortfolioUpload";
import { ProfileReviews } from "@/components/profile/ProfileReviews";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Award, Settings, Shield } from "lucide-react";

const TalentProfile = () => {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [workExperience, setWorkExperience] = useState<any[]>([]);
  const [education, setEducation] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);

  // If no userId param, show own profile
  const targetUserId = paramUserId || user?.id;
  const isOwner = !!user && targetUserId === user.id;

  const fetchProfile = useCallback(async () => {
    if (!targetUserId) return;
    setLoading(true);
    try {
      // Fetch profile
      const { data: profileData, error: profileErr } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (profileErr) throw profileErr;
      if (!profileData) {
        if (isOwner) {
          navigate("/profile-setup");
        } else {
          toast.error("Profile not found");
          navigate("/talents");
        }
        return;
      }

      setProfile(profileData);

      // Fetch related data in parallel
      const [weRes, eduRes, certRes] = await Promise.all([
        supabase.from("work_experience").select("*").eq("profile_id", profileData.id).order("start_date", { ascending: false }),
        supabase.from("education").select("*").eq("profile_id", profileData.id).order("start_date", { ascending: false }),
        supabase.from("certifications").select("*").eq("talent_id", profileData.id).order("created_at", { ascending: false }),
      ]);

      setWorkExperience(weRes.data || []);
      setEducation(eduRes.data || []);
      setCertifications(certRes.data || []);
    } catch (err: any) {
      console.error("Profile load error:", err);
      toast.error("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [targetUserId, isOwner, navigate]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const toggleVisibility = async () => {
    if (!profile) return;
    const newVis = profile.profile_visibility === "private" ? "public" : "private";
    const { error } = await supabase.from("profiles").update({ profile_visibility: newVis }).eq("id", profile.id);
    if (error) {
      toast.error("Failed to update visibility");
    } else {
      setProfile({ ...profile, profile_visibility: newVis });
      toast.success(`Profile is now ${newVis}`);
    }
  };

  const completionPercent = (() => {
    if (!profile) return 0;
    let score = 0;
    const total = 8;
    if (profile.full_name) score++;
    if (profile.job_title) score++;
    if (profile.location) score++;
    if (profile.bio) score++;
    if (Array.isArray(profile.skills) && profile.skills.length > 0) score++;
    if (workExperience.length > 0) score++;
    if (education.length > 0) score++;
    if (profile.avatar_url) score++;
    return Math.round((score / total) * 100);
  })();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-muted/30">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
          <ProfileHeaderSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <SkillsSkeleton />
              <WorkExperienceSkeleton />
              <EducationSkeleton />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-48 w-full rounded-xl" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!profile) return null;

  const skills: string[] = Array.isArray(profile.skills) ? profile.skills : [];

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-5xl space-y-6">
        {/* Owner toolbar */}
        {isOwner && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Profile</h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/profile-setup")}>
                <Settings className="h-4 w-4" /> Edit Profile
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => navigate("/verification")}>
                <Shield className="h-4 w-4" /> Verification
              </Button>
            </div>
          </div>
        )}

        <TalentProfileHeader
          profile={profile}
          completionPercent={completionPercent}
          isOwner={isOwner}
          onMessage={() => navigate(`/messages?recipient=${targetUserId}`)}
          onToggleVisibility={toggleVisibility}
          onProfileUpdate={(updates) => setProfile((prev: any) => ({ ...prev, ...updates }))}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            <SkillsSection skills={skills} />

            <WorkExperienceSection
              items={workExperience}
              profileId={profile.id}
              userId={profile.user_id}
              isOwner={isOwner}
              onRefresh={fetchProfile}
            />

            <EducationSection
              items={education}
              profileId={profile.id}
              userId={profile.user_id}
              isOwner={isOwner}
              onRefresh={fetchProfile}
            />

            {/* Certifications */}
            {certifications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Award className="h-5 w-5 text-muted-foreground" /> Certifications
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {certifications.map((cert: any) => (
                      <div key={cert.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <p className="font-medium text-sm">{cert.certificate_name}</p>
                          {cert.issue_date && (
                            <p className="text-xs text-muted-foreground">
                              Issued {new Date(cert.issue_date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {cert.verified && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              ✓ Verified
                            </Badge>
                          )}
                          {cert.certificate_url && (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={cert.certificate_url} target="_blank" rel="noopener noreferrer">View</a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Portfolio */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Portfolio</CardTitle>
                {isOwner && <PortfolioUpload profileId={profile.id} onUploadComplete={fetchProfile} />}
              </CardHeader>
              <CardContent>
                <PortfolioGallery profileId={profile.id} isOwner={isOwner} />
              </CardContent>
            </Card>

            {/* Reviews */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Reviews</CardTitle>
              </CardHeader>
              <CardContent>
                <ProfileReviews revieweeId={profile.user_id} />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {isOwner && <AIRecommendationsWidget profileId={profile.id} />}

            {/* Quick stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Profile Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Gigs Completed</span>
                  <span className="font-medium">{profile.total_gigs_completed ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="font-medium">
                    {profile.average_rating ? `${Number(profile.average_rating).toFixed(1)} ⭐` : "No ratings yet"}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Member Since</span>
                  <span className="font-medium">{new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>

            {/* Verification status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Shield className="h-4 w-4" /> Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Identity</span>
                  {profile.id_verified ? (
                    <Badge variant="secondary" className="text-xs">Verified ✓</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs">Pending</Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Skills</span>
                  <Badge variant="outline" className="text-xs">{certifications.length > 0 ? `${certifications.length} certs` : "None"}</Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TalentProfile;
