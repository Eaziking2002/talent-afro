import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useRoleGuard } from "@/hooks/useRoleGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, X, Plus, Briefcase } from "lucide-react";

const PostJob = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { allowed, loading: guardLoading } = useRoleGuard("employer");
  const { toast } = useToast();

  const [employerId, setEmployerId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [skillInput, setSkillInput] = useState("");

  const [form, setForm] = useState({
    title: "",
    description: "",
    location: "",
    remote: true,
    job_type: "full-time",
    budget_min: "",
    budget_max: "",
    duration_days: "30",
    required_skills: [] as string[],
  });

  useEffect(() => {
    if (!user) return;
    supabase
      .from("employers")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.id) setEmployerId(data.id);
        else navigate("/profile-setup");
      });
  }, [user, navigate]);

  const addSkill = () => {
    const s = skillInput.trim();
    if (!s || form.required_skills.includes(s)) return;
    setForm((f) => ({ ...f, required_skills: [...f.required_skills, s] }));
    setSkillInput("");
  };

  const removeSkill = (s: string) =>
    setForm((f) => ({ ...f, required_skills: f.required_skills.filter((x) => x !== s) }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employerId) return;
    if (!form.title || !form.description || !form.budget_min || !form.budget_max) {
      toast({ title: "Missing fields", description: "Title, description, and budget are required.", variant: "destructive" });
      return;
    }
    const min = Number(form.budget_min);
    const max = Number(form.budget_max);
    if (max < min) {
      toast({ title: "Invalid budget", description: "Max budget must be greater than min.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("jobs").insert({
      employer_id: employerId,
      title: form.title,
      description: form.description,
      location: form.location || null,
      remote: form.remote,
      job_type: form.job_type,
      budget_min: min,
      budget_max: max,
      duration_days: form.duration_days ? Number(form.duration_days) : null,
      required_skills: form.required_skills,
      status: "open",
      source: "manual",
      verification_status: "unverified",
    });
    setSubmitting(false);
    if (error) {
      toast({ title: "Failed to post job", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Job submitted",
      description: "Your job is live and pending admin verification.",
    });
    navigate("/employer/dashboard");
  };

  if (guardLoading || !allowed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-6 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Briefcase className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Post a Job</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Job details</CardTitle>
            <CardDescription>
              Submitted jobs are reviewed by admins before being marked verified. Talents can apply immediately.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-5">
              <div>
                <Label htmlFor="title">Job title *</Label>
                <Input id="title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Senior React Developer" required />
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea id="description" rows={6} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Role, responsibilities, requirements..." required />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Lagos, Nigeria" />
                </div>
                <div>
                  <Label htmlFor="job_type">Job type</Label>
                  <Select value={form.job_type} onValueChange={(v) => setForm({ ...form, job_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">Full-time</SelectItem>
                      <SelectItem value="part-time">Part-time</SelectItem>
                      <SelectItem value="contract">Contract</SelectItem>
                      <SelectItem value="internship">Internship</SelectItem>
                      <SelectItem value="freelance">Freelance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between border rounded-lg p-3">
                <div>
                  <p className="font-medium">Remote-friendly</p>
                  <p className="text-sm text-muted-foreground">Allow remote applicants</p>
                </div>
                <Switch checked={form.remote} onCheckedChange={(v) => setForm({ ...form, remote: v })} />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="bmin">Min budget (USD) *</Label>
                  <Input id="bmin" type="number" min="0" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="bmax">Max budget (USD) *</Label>
                  <Input id="bmax" type="number" min="0" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} required />
                </div>
                <div>
                  <Label htmlFor="dur">Duration (days)</Label>
                  <Input id="dur" type="number" min="1" value={form.duration_days} onChange={(e) => setForm({ ...form, duration_days: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Required skills</Label>
                <div className="flex gap-2">
                  <Input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder="e.g. React"
                  />
                  <Button type="button" variant="outline" onClick={addSkill}><Plus className="h-4 w-4" /></Button>
                </div>
                {form.required_skills.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {form.required_skills.map((s) => (
                      <Badge key={s} variant="secondary" className="gap-1">
                        {s}
                        <button type="button" onClick={() => removeSkill(s)}><X className="h-3 w-3" /></button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
                <Button type="submit" disabled={submitting} className="flex-1">
                  {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Submit Job
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PostJob;
