import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ApplicationStatusBadge, STATUS_ORDER, type TrackingStatus } from "@/components/application/ApplicationStatusBadge";
import { toast } from "@/hooks/use-toast";
import { User, FileText, Linkedin, Github, ExternalLink, MapPin, Briefcase, DollarSign, Mail } from "lucide-react";

interface Row {
  id: string;
  tracking_status: TrackingStatus;
  created_at: string;
  cover_letter: string | null;
  cv_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  portfolio_links: string[] | null;
  salary_expectation_minor_units: number | null;
  salary_currency: string | null;
  availability: string | null;
  country: string | null;
  years_experience: number | null;
  remote_preference: string | null;
  applicant: { id: string; full_name: string | null; user_id: string } | null;
  jobs: { id: string; title: string; company_name: string | null } | null;
}

export default function EmployerApplications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [cvUrl, setCvUrl] = useState<string | null>(null);

  useEffect(() => { if (!authLoading && !user) navigate("/auth"); }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: emp } = await supabase.from("employers").select("id").eq("user_id", user.id).maybeSingle();
      if (!emp) { setLoading(false); return; }
      const { data: jobs } = await supabase.from("jobs").select("id").eq("employer_id", emp.id);
      const jobIds = (jobs ?? []).map(j => j.id);
      if (!jobIds.length) { setLoading(false); return; }
      const { data } = await supabase
        .from("applications")
        .select(`id, tracking_status, created_at, cover_letter, cv_url, linkedin_url, github_url, portfolio_links, salary_expectation_minor_units, salary_currency, availability, country, years_experience, remote_preference,
          applicant:profiles!applications_applicant_id_fkey(id, full_name, user_id),
          jobs(id, title, company_name)`)
        .in("job_id", jobIds)
        .order("created_at", { ascending: false });
      setRows((data as any) ?? []);
      setLoading(false);
    })();
  }, [user]);

  const openCandidate = async (r: Row) => {
    setSelected(r);
    setCvUrl(null);
    // mark as viewed
    if (r.tracking_status === "submitted") {
      const { error } = await supabase.from("applications").update({ tracking_status: "viewed", viewed_at: new Date().toISOString() }).eq("id", r.id);
      if (!error) setRows(prev => prev.map(x => x.id === r.id ? { ...x, tracking_status: "viewed" } : x));
    }
    // signed url for CV
    if (r.cv_url) {
      const { data } = await supabase.storage.from("application-cvs").createSignedUrl(r.cv_url, 3600);
      if (data?.signedUrl) setCvUrl(data.signedUrl);
    }
  };

  const updateStatus = async (id: string, status: TrackingStatus) => {
    const { error } = await supabase.from("applications").update({ tracking_status: status }).eq("id", id);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); return; }
    setRows(prev => prev.map(x => x.id === id ? { ...x, tracking_status: status } : x));
    if (selected?.id === id) setSelected({ ...selected, tracking_status: status });
    toast({ title: `Moved to ${status}` });
  };

  const grouped = STATUS_ORDER.reduce((acc, s) => { acc[s] = rows.filter(r => r.tracking_status === s); return acc; }, {} as Record<TrackingStatus, Row[]>);

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-10">
        <div className="mb-6 flex items-end justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Applicant Pipeline</h1>
            <p className="text-sm text-muted-foreground mt-1">{rows.length} total applicants across your jobs</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/employer/dashboard")}>Back to dashboard</Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {STATUS_ORDER.map(status => (
              <div key={status} className="bg-card border rounded-xl p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-3 px-1">
                  <ApplicationStatusBadge status={status} />
                  <span className="text-xs text-muted-foreground">{grouped[status].length}</span>
                </div>
                <div className="space-y-2">
                  {grouped[status].length === 0 && <p className="text-xs text-muted-foreground text-center py-6">Empty</p>}
                  {grouped[status].map(r => (
                    <button key={r.id} onClick={() => openCandidate(r)} className="w-full text-left p-3 rounded-lg border bg-background hover:border-primary/40 hover:shadow-sm transition">
                      <p className="font-medium text-sm truncate">{r.applicant?.full_name || "Anonymous"}</p>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{r.jobs?.title}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                        {r.country && <span className="flex items-center gap-0.5"><MapPin className="h-3 w-3" />{r.country}</span>}
                        {r.years_experience != null && <span>{r.years_experience}y exp</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="overflow-y-auto sm:max-w-xl w-full">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 grid place-items-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p>{selected.applicant?.full_name || "Anonymous"}</p>
                    <p className="text-xs font-normal text-muted-foreground">applied to {selected.jobs?.title}</p>
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div>
                  <label className="text-xs text-muted-foreground">Move to status</label>
                  <Select value={selected.tracking_status} onValueChange={(v) => updateStatus(selected.id, v as TrackingStatus)}>
                    <SelectTrigger className="mt-1.5"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <Info icon={MapPin} label="Country" value={selected.country} />
                  <Info icon={Briefcase} label="Experience" value={selected.years_experience != null ? `${selected.years_experience} years` : null} />
                  <Info icon={User} label="Availability" value={selected.availability} />
                  <Info icon={MapPin} label="Remote pref" value={selected.remote_preference} />
                  <Info icon={DollarSign} label="Salary" value={selected.salary_expectation_minor_units ? `${selected.salary_currency} ${(selected.salary_expectation_minor_units / 100).toLocaleString()}/mo` : null} />
                </div>

                <div className="flex flex-wrap gap-2">
                  {cvUrl && <Button asChild size="sm" variant="outline" className="gap-1.5"><a href={cvUrl} target="_blank" rel="noreferrer"><FileText className="h-4 w-4" />View CV</a></Button>}
                  {selected.linkedin_url && <Button asChild size="sm" variant="outline" className="gap-1.5"><a href={selected.linkedin_url} target="_blank" rel="noreferrer"><Linkedin className="h-4 w-4" />LinkedIn</a></Button>}
                  {selected.github_url && <Button asChild size="sm" variant="outline" className="gap-1.5"><a href={selected.github_url} target="_blank" rel="noreferrer"><Github className="h-4 w-4" />GitHub</a></Button>}
                  {(selected.portfolio_links ?? []).filter(Boolean).map((l, i) => (
                    <Button key={i} asChild size="sm" variant="outline" className="gap-1.5"><a href={l} target="_blank" rel="noreferrer"><ExternalLink className="h-4 w-4" />Portfolio {i + 1}</a></Button>
                  ))}
                </div>

                {selected.cover_letter && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2">Cover letter</h4>
                    <div className="rounded-lg border bg-muted/30 p-3 text-sm whitespace-pre-wrap">{selected.cover_letter}</div>
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-2.5">
      <p className="text-xs text-muted-foreground flex items-center gap-1"><Icon className="h-3 w-3" />{label}</p>
      <p className="text-sm font-medium mt-0.5 capitalize">{value || "—"}</p>
    </div>
  );
}
