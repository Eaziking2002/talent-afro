import { useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { CVUpload } from "./CVUpload";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles, Plus, Trash2,
  User, FileText, MessageSquareText, Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Step = 0 | 1 | 2 | 3;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  jobDescription?: string;
  jobSkills?: string[];
}

const STEPS = [
  { title: "About you", icon: User, desc: "Quick profile basics" },
  { title: "CV & links", icon: FileText, desc: "Resume + portfolio" },
  { title: "Cover letter", icon: MessageSquareText, desc: "Pitch + salary" },
  { title: "Review", icon: Eye, desc: "Submit application" },
] as const;

interface DraftData {
  country: string;
  years_experience: string;
  availability: string;
  remote_preference: string;
  cv_url: string;
  linkedin_url: string;
  github_url: string;
  portfolio_links: string[];
  cover_letter: string;
  salary_expectation: string;
  salary_currency: string;
}

const EMPTY: DraftData = {
  country: "", years_experience: "", availability: "", remote_preference: "",
  cv_url: "", linkedin_url: "", github_url: "", portfolio_links: [],
  cover_letter: "", salary_expectation: "", salary_currency: "USD",
};

const URL_RE = /^https?:\/\/[^\s]+$/i;

export function ApplicationWorkflow(props: Props) {
  const isMobile = useIsMobile();
  const Wrapper = isMobile ? Sheet : Dialog;
  const Body = isMobile ? SheetContent : DialogContent;
  const Head = isMobile ? SheetHeader : DialogHeader;
  const TitleEl = isMobile ? SheetTitle : DialogTitle;
  const DescEl = isMobile ? SheetDescription : DialogDescription;

  const sheetProps = isMobile ? { side: "bottom" as const, className: "max-h-[95vh] overflow-y-auto p-0" } : { className: "max-w-2xl p-0 max-h-[92vh] overflow-y-auto" };

  return (
    <Wrapper open={props.open} onOpenChange={props.onOpenChange}>
      <Body {...(sheetProps as any)}>
        <Inner {...props} TitleEl={TitleEl} DescEl={DescEl} HeadEl={Head} />
      </Body>
    </Wrapper>
  );
}

function Inner({
  jobId, jobTitle, companyName, jobDescription, jobSkills,
  onOpenChange, TitleEl, DescEl, HeadEl,
}: Props & { TitleEl: any; DescEl: any; HeadEl: any }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(0);
  const [data, setData] = useState<DraftData>(EMPTY);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const honeypotRef = useRef<HTMLInputElement>(null);
  const openedAt = useRef(Date.now());

  // Load profile + draft + duplicate check
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: prof } = await supabase
        .from("profiles").select("id, full_name, location").eq("user_id", user.id).maybeSingle();
      if (prof) {
        setProfileId(prof.id);
        setData(d => ({ ...d, country: d.country || prof.location || "" }));
        // duplicate check
        const { data: existing } = await supabase
          .from("applications").select("id").eq("job_id", jobId).eq("applicant_id", prof.id).maybeSingle();
        if (existing) setAlreadyApplied(true);
      }
      // load draft
      const { data: draft } = await supabase
        .from("saved_applications").select("draft_data").eq("user_id", user.id).eq("job_id", jobId).maybeSingle();
      if (draft?.draft_data) setData(d => ({ ...d, ...(draft.draft_data as any) }));
    })();
  }, [user, jobId]);

  // Persist draft (debounced)
  useEffect(() => {
    if (!user || alreadyApplied) return;
    const t = setTimeout(() => {
      supabase.from("saved_applications").upsert(
        { user_id: user.id, job_id: jobId, draft_data: data as any },
        { onConflict: "user_id,job_id" }
      ).then(({ error }) => error && console.warn("draft save:", error.message));
    }, 800);
    return () => clearTimeout(t);
  }, [data, user, jobId, alreadyApplied]);

  const setField = <K extends keyof DraftData>(k: K, v: DraftData[K]) => setData(d => ({ ...d, [k]: v }));

  const stepValid = useMemo(() => {
    if (step === 0) return data.country && data.years_experience !== "" && data.availability && data.remote_preference;
    if (step === 1) return !!data.cv_url; // CV required
    if (step === 2) return data.cover_letter.trim().length >= 50;
    return true;
  }, [step, data]);

  const portfolioErrors = data.portfolio_links.some(l => l && !URL_RE.test(l));

  const generateCoverLetter = async () => {
    setGeneratingAI(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("ai-cover-letter", {
        body: {
          jobTitle, companyName, jobDescription, skills: jobSkills,
          yearsExperience: data.years_experience,
        },
      });
      if (error) throw error;
      if (res?.coverLetter) {
        setField("cover_letter", res.coverLetter);
        toast({ title: "Draft generated ✨", description: "Edit it to make it yours." });
      }
    } catch (e: any) {
      toast({ title: "AI unavailable", description: "Please write your letter manually.", variant: "destructive" });
    } finally {
      setGeneratingAI(false);
    }
  };

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    if (!profileId) { toast({ title: "Complete your profile first", variant: "destructive" }); navigate("/profile-setup"); return; }
    if (honeypotRef.current?.value) return;
    if (Date.now() - openedAt.current < 3000) {
      toast({ title: "Please review your application before submitting", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("applications").insert({
        job_id: jobId,
        applicant_id: profileId,
        proposal_text: data.cover_letter.trim(),
        cover_letter: data.cover_letter.trim(),
        cv_url: data.cv_url || null,
        linkedin_url: data.linkedin_url || null,
        github_url: data.github_url || null,
        portfolio_links: data.portfolio_links.filter(Boolean),
        salary_expectation_minor_units: data.salary_expectation ? Math.round(parseFloat(data.salary_expectation) * 100) : null,
        salary_currency: data.salary_currency,
        availability: data.availability,
        country: data.country,
        years_experience: data.years_experience ? parseInt(data.years_experience) : null,
        remote_preference: data.remote_preference,
        tracking_status: "submitted",
        status: "pending",
      } as any);

      if (error) {
        if (error.code === "23505") {
          toast({ title: "Already applied", description: "You've already applied to this job.", variant: "destructive" });
          setAlreadyApplied(true);
        } else throw error;
      } else {
        // delete draft
        await supabase.from("saved_applications").delete().eq("user_id", user.id).eq("job_id", jobId);
        // fire-and-forget confirmation email (don't block UX on failure)
        supabase.functions.invoke("send-application-email", {
          body: {
            type: "submitted",
            to: user.email,
            jobTitle,
            companyName,
          },
        }).catch((err) => console.warn("email confirm failed:", err?.message));
        toast({ title: "Application submitted! 🎉", description: "We'll notify you when the employer responds." });
        onOpenChange(false);
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Submission failed", description: e.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (alreadyApplied) {
    return (
      <div className="p-6 text-center">
        <div className="mx-auto h-12 w-12 rounded-full bg-secondary/15 flex items-center justify-center mb-3">
          <CheckCircle2 className="h-6 w-6 text-secondary" />
        </div>
        <h3 className="text-lg font-semibold">You've already applied</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4">Track this application in your dashboard.</p>
        <Button onClick={() => { onOpenChange(false); navigate("/applications"); }}>View My Applications</Button>
      </div>
    );
  }

  return (
    <>
      <HeadEl className="px-6 pt-6 pb-4 border-b bg-gradient-to-br from-primary/[0.04] via-transparent to-secondary/[0.04]">
        <TitleEl className="text-xl">Apply to {jobTitle}</TitleEl>
        <DescEl className="text-sm">at {companyName}</DescEl>
        {/* Stepper */}
        <div className="flex items-center gap-1 sm:gap-2 mt-4">
          {STEPS.map((s, i) => {
            const Active = i === step;
            const Done = i < step;
            const Icon = s.icon;
            return (
              <div key={s.title} className="flex items-center flex-1">
                <button
                  type="button"
                  onClick={() => i < step && setStep(i as Step)}
                  className={cn(
                    "flex items-center gap-2 transition-all",
                    Active ? "text-primary" : Done ? "text-secondary" : "text-muted-foreground/60"
                  )}
                >
                  <span className={cn(
                    "h-7 w-7 rounded-full grid place-items-center border-2 transition-all shrink-0",
                    Active ? "border-primary bg-primary/10" : Done ? "border-secondary bg-secondary/10" : "border-border"
                  )}>
                    {Done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-3.5 w-3.5" />}
                  </span>
                  <span className="text-xs font-medium hidden sm:inline">{s.title}</span>
                </button>
                {i < STEPS.length - 1 && <div className={cn("flex-1 h-px mx-1 sm:mx-2", Done ? "bg-secondary" : "bg-border")} />}
              </div>
            );
          })}
        </div>
      </HeadEl>

      <div className="p-6 space-y-4">
        {/* Honeypot */}
        <input ref={honeypotRef} type="text" name="website" tabIndex={-1} autoComplete="off"
          className="absolute -left-[9999px] opacity-0 pointer-events-none" aria-hidden />

        {step === 0 && (
          <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-2 duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Country *</Label>
                <Input placeholder="e.g. Nigeria" value={data.country} onChange={(e) => setField("country", e.target.value)} maxLength={80} />
              </div>
              <div className="space-y-1.5">
                <Label>Years of experience *</Label>
                <Input type="number" min={0} max={60} placeholder="3" value={data.years_experience} onChange={(e) => setField("years_experience", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Availability *</Label>
                <Select value={data.availability} onValueChange={(v) => setField("availability", v)}>
                  <SelectTrigger><SelectValue placeholder="When can you start?" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediately</SelectItem>
                    <SelectItem value="2_weeks">Within 2 weeks</SelectItem>
                    <SelectItem value="1_month">Within 1 month</SelectItem>
                    <SelectItem value="negotiable">Negotiable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Remote work preference *</Label>
                <Select value={data.remote_preference} onValueChange={(v) => setField("remote_preference", v)}>
                  <SelectTrigger><SelectValue placeholder="Your ideal setup" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="remote">Remote only</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
                    <SelectItem value="onsite">On-site</SelectItem>
                    <SelectItem value="any">Open to any</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 1 && user && (
          <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-2 duration-300">
            <div className="space-y-1.5">
              <Label>CV / Resume *</Label>
              <CVUpload userId={user.id} value={data.cv_url || undefined} onChange={(v) => setField("cv_url", v ?? "")} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>LinkedIn URL</Label>
                <Input type="url" placeholder="https://linkedin.com/in/…" value={data.linkedin_url} onChange={(e) => setField("linkedin_url", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>GitHub URL</Label>
                <Input type="url" placeholder="https://github.com/…" value={data.github_url} onChange={(e) => setField("github_url", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Portfolio links</Label>
              {data.portfolio_links.map((link, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    type="url" placeholder="https://…" value={link}
                    onChange={(e) => { const next = [...data.portfolio_links]; next[i] = e.target.value; setField("portfolio_links", next); }}
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => setField("portfolio_links", data.portfolio_links.filter((_, idx) => idx !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {data.portfolio_links.length < 5 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setField("portfolio_links", [...data.portfolio_links, ""])} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> Add link
                </Button>
              )}
              {portfolioErrors && <p className="text-xs text-destructive">Links must start with http:// or https://</p>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in-50 slide-in-from-right-2 duration-300">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Cover letter *</Label>
                <Button type="button" variant="ghost" size="sm" onClick={generateCoverLetter} disabled={generatingAI} className="gap-1.5 text-secondary">
                  {generatingAI ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                  AI generate
                </Button>
              </div>
              <Textarea
                placeholder="Why are you the best fit? Highlight relevant experience and what excites you about this role…"
                value={data.cover_letter}
                onChange={(e) => setField("cover_letter", e.target.value)}
                className="min-h-[180px] resize-y"
                maxLength={4000}
              />
              <p className="text-xs text-muted-foreground text-right">{data.cover_letter.length} / 4000</p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5 col-span-2">
                <Label>Salary expectation (per month)</Label>
                <Input type="number" min={0} placeholder="2500" value={data.salary_expectation} onChange={(e) => setField("salary_expectation", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select value={data.salary_currency} onValueChange={(v) => setField("salary_currency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["USD", "EUR", "GBP", "NGN", "KES", "ZAR", "GHS"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 animate-in fade-in-50 slide-in-from-right-2 duration-300">
            <p className="text-sm text-muted-foreground">Quick review before you submit:</p>
            <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
              <Row label="Country" value={data.country} />
              <Row label="Experience" value={`${data.years_experience} years`} />
              <Row label="Availability" value={prettyAvail(data.availability)} />
              <Row label="Remote" value={prettyRemote(data.remote_preference)} />
              <Row label="CV" value={data.cv_url ? "Uploaded ✓" : "—"} />
              <Row label="LinkedIn" value={data.linkedin_url || "—"} />
              <Row label="GitHub" value={data.github_url || "—"} />
              <Row label="Portfolio" value={data.portfolio_links.filter(Boolean).length ? `${data.portfolio_links.filter(Boolean).length} link(s)` : "—"} />
              <Row label="Salary" value={data.salary_expectation ? `${data.salary_currency} ${parseFloat(data.salary_expectation).toLocaleString()}/mo` : "—"} />
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground mb-1">Cover letter</p>
                <p className="line-clamp-4 text-sm">{data.cover_letter}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="outline" className="gap-1 bg-secondary/5 border-secondary/20 text-secondary">
                <CheckCircle2 className="h-3 w-3" /> Spam protected
              </Badge>
              <Badge variant="outline" className="gap-1">Duplicate checked</Badge>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-6 py-4 flex items-center justify-between gap-3">
        <Button type="button" variant="ghost" disabled={step === 0 || submitting} onClick={() => setStep((s) => (s - 1) as Step)}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Back
        </Button>
        {step < 3 ? (
          <Button type="button" disabled={!stepValid || (step === 1 && portfolioErrors)} onClick={() => setStep((s) => (s + 1) as Step)} className="gap-1.5">
            Next <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button type="button" onClick={submit} disabled={submitting} className="gap-1.5 bg-gradient-to-r from-primary to-secondary text-primary-foreground hover:opacity-95">
            {submitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Submitting…</> : <>Submit application</>}
          </Button>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right truncate max-w-[60%]">{value}</span>
    </div>
  );
}
function prettyAvail(v: string) { return ({ immediate: "Immediately", "2_weeks": "2 weeks", "1_month": "1 month", negotiable: "Negotiable" } as any)[v] ?? "—"; }
function prettyRemote(v: string) { return ({ remote: "Remote only", hybrid: "Hybrid", onsite: "On-site", any: "Open" } as any)[v] ?? "—"; }
