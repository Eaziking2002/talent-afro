import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { X, CheckCircle2, ArrowRight, SkipForward, Loader2 } from "lucide-react";
import { z } from "zod";

const talentProfileSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters").max(100),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  location: z.string().min(2, "Location is required").max(100),
  skills: z.array(z.string()).min(1, "Add at least one skill"),
});

const employerProfileSchema = z.object({
  companyName: z.string().min(2, "Company name is required").max(100),
  companyDescription: z.string().max(1000).optional(),
  website: z.string().url("Invalid URL").optional().or(z.literal("")),
});

type UserRole = "talent" | "employer";

const ProfileSetup = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const [existingProfileId, setExistingProfileId] = useState<string | null>(null);
  const [existingEmployerId, setExistingEmployerId] = useState<string | null>(null);

  // Talent fields
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");

  // Employer fields
  const [companyName, setCompanyName] = useState("");
  const [companyDescription, setCompanyDescription] = useState("");
  const [website, setWebsite] = useState("");

  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Load existing profile data + role
  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate("/auth");
      return;
    }

    let cancelled = false;

    const loadExistingData = async () => {
      try {
        // Get role
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cancelled) return;

        // Default to "talent" if no role assigned yet (new signup)
        const userRole = (roleData?.role as UserRole) || "talent";
        setRole(userRole);

        if (userRole === "employer") {
          const { data: employer } = await supabase
            .from("employers")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (cancelled) return;
          if (employer) {
            setExistingEmployerId(employer.id);
            setCompanyName(employer.company_name || "");
            setCompanyDescription(employer.company_description || "");
            setWebsite(employer.website || "");
          }
        } else {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", user.id)
            .maybeSingle();

          if (cancelled) return;
          if (profile) {
            setExistingProfileId(profile.id);
            setFullName(profile.full_name || "");
            setBio(profile.bio || "");
            setLocation(profile.location || "");
            setSkills(Array.isArray(profile.skills) ? (profile.skills as string[]) : []);
          }
        }
      } catch (err) {
        console.error("Error loading profile data:", err);
      } finally {
        if (!cancelled) setPageLoading(false);
      }
    };

    loadExistingData();
    return () => { cancelled = true; };
  }, [user, authLoading, navigate]);

  // Progress calculation
  const getProgress = () => {
    if (role === "employer") {
      let filled = 0;
      const total = 3;
      if (companyName.trim()) filled++;
      if (companyDescription.trim()) filled++;
      if (website.trim()) filled++;
      return Math.round((filled / total) * 100);
    }
    let filled = 0;
    const total = 4;
    if (fullName.trim()) filled++;
    if (location.trim()) filled++;
    if (skills.length > 0) filled++;
    if (bio.trim()) filled++;
    return Math.round((filled / total) * 100);
  };

  const addSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim()) && skills.length < 10) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSaveDraft = async () => {
    if (!user) return;
    setIsSavingDraft(true);
    try {
      if (role === "employer") {
        await saveEmployerProfile();
      } else {
        await saveTalentProfile();
      }
      toast.success("Progress saved!");
    } catch {
      toast.error("Failed to save progress. Please try again.");
    } finally {
      setIsSavingDraft(false);
    }
  };

  const saveTalentProfile = async () => {
    if (!user) throw new Error("Not authenticated");
    const profileData = {
      user_id: user.id,
      full_name: fullName.trim() || "New User",
      bio: bio.trim() || null,
      location: location.trim() || null,
      skills: skills.length > 0 ? skills : null,
    };

    if (existingProfileId) {
      const { error } = await supabase.from("profiles").update(profileData).eq("id", existingProfileId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("profiles").insert(profileData).select("id").single();
      if (error) throw error;
      if (data) setExistingProfileId(data.id);
    }
  };

  const saveEmployerProfile = async () => {
    if (!user) throw new Error("Not authenticated");
    const employerData = {
      user_id: user.id,
      company_name: companyName.trim() || "My Company",
      company_description: companyDescription.trim() || null,
      website: website.trim() || null,
    };

    if (existingEmployerId) {
      const { error } = await supabase.from("employers").update(employerData).eq("id", existingEmployerId);
      if (error) throw error;
    } else {
      const { data, error } = await supabase.from("employers").insert(employerData).select("id").single();
      if (error) throw error;
      if (data) setExistingEmployerId(data.id);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Session expired. Please sign in again.");
      navigate("/auth");
      return;
    }

    try {
      if (role === "employer") {
        employerProfileSchema.parse({ companyName, companyDescription, website });
      } else {
        talentProfileSchema.parse({ fullName, bio, location, skills });
      }

      setIsLoading(true);

      if (role === "employer") {
        await saveEmployerProfile();
        toast.success("Company profile completed!");
        navigate("/employer/dashboard");
      } else {
        await saveTalentProfile();
        toast.success("Profile completed!");
        navigate("/dashboard");
      }
    } catch (err) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        console.error("Profile save error:", err);
        toast.error("Failed to save profile. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    navigate(role === "employer" ? "/employer/dashboard" : "/dashboard");
  };

  if (authLoading || pageLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/20 to-background">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Loading your profile…</p>
        </div>
      </div>
    );
  }

  const progress = getProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background py-8 px-4 pb-24 md:pb-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress Header */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold">Complete Your Profile</h1>
            <button
              onClick={handleSkip}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SkipForward className="w-4 h-4" />
              Skip for now
            </button>
          </div>

          <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Profile completeness</span>
              <span className="font-medium">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {progress === 100 && (
            <div className="flex items-center gap-2 text-sm text-primary bg-primary/10 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4" />
              Your profile looks great! Submit to get started.
            </div>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {role === "employer" ? "Company Details" : "Personal Details"}
            </CardTitle>
            <CardDescription>
              {role === "employer"
                ? "Tell talent about your company to attract the best candidates"
                : "Help employers find you by completing your profile"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {role === "employer" ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name *</Label>
                    <Input id="companyName" placeholder="Your Company Ltd" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyDescription">Company Description</Label>
                    <Textarea id="companyDescription" placeholder="Tell talent about your company…" value={companyDescription} onChange={(e) => setCompanyDescription(e.target.value)} rows={4} maxLength={1000} />
                    <p className="text-xs text-muted-foreground">{companyDescription.length}/1000</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Company Website</Label>
                    <Input id="website" type="url" placeholder="https://yourcompany.com" value={website} onChange={(e) => setWebsite(e.target.value)} />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name *</Label>
                    <Input id="fullName" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location *</Label>
                    <Input id="location" placeholder="Freetown, Sierra Leone" value={location} onChange={(e) => setLocation(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="skills">Your Skills *</Label>
                    <div className="flex gap-2">
                      <Input id="skills" placeholder="e.g., Graphic Design" value={currentSkill} onChange={(e) => setCurrentSkill(e.target.value)} onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())} />
                      <Button type="button" onClick={addSkill} variant="secondary">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-sm py-1 px-3">
                          {skill}
                          <button type="button" onClick={() => removeSkill(skill)} className="ml-2 hover:text-destructive">
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                    {skills.length === 0 && <p className="text-xs text-muted-foreground">Add your skills to help employers find you</p>}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bio">Short Bio</Label>
                    <Textarea id="bio" placeholder="Tell employers about yourself…" value={bio} onChange={(e) => setBio(e.target.value)} rows={4} maxLength={500} />
                    <p className="text-xs text-muted-foreground">{bio.length}/500</p>
                  </div>
                </>
              )}

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button type="button" variant="outline" onClick={handleSaveDraft} disabled={isSavingDraft} className="sm:flex-1">
                  {isSavingDraft ? "Saving…" : "Save Progress"}
                </Button>
                <Button type="submit" disabled={isLoading} className="sm:flex-1 gap-2">
                  {isLoading ? "Completing…" : "Complete Profile"}
                  {!isLoading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileSetup;
