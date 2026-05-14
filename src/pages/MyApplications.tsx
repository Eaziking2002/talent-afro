import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ApplicationStatusBadge, STATUS_ORDER, type TrackingStatus } from "@/components/application/ApplicationStatusBadge";
import { Briefcase, Building2, Calendar, ExternalLink } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AppRow {
  id: string;
  tracking_status: TrackingStatus;
  status_updated_at: string | null;
  created_at: string;
  cover_letter: string | null;
  jobs: {
    id: string;
    title: string;
    company_name: string | null;
    company_logo_url: string | null;
    location: string | null;
    remote: boolean | null;
    budget_min: number;
    budget_max: number;
    salary_currency: string | null;
  } | null;
}

export default function MyApplications() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [apps, setApps] = useState<AppRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | TrackingStatus>("all");

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user) return;
    let mounted = true;
    (async () => {
      const { data: prof } = await supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!prof) { setLoading(false); return; }
      const { data, error } = await supabase
        .from("applications")
        .select("id, tracking_status, status_updated_at, created_at, cover_letter, jobs(id, title, company_name, company_logo_url, location, remote, budget_min, budget_max, salary_currency)")
        .eq("applicant_id", prof.id)
        .order("status_updated_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (!mounted) return;
      if (!error) setApps((data as any[]) || []);
      setLoading(false);
    })();

    // realtime subscribe to status changes
    const channel = supabase.channel(`my-apps-${user.id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "applications" }, () => {
        // simple refetch
        supabase.from("profiles").select("id").eq("user_id", user.id).maybeSingle().then(async ({ data: p }) => {
          if (!p) return;
          const { data } = await supabase
            .from("applications")
            .select("id, tracking_status, status_updated_at, created_at, cover_letter, jobs(id, title, company_name, company_logo_url, location, remote, budget_min, budget_max, salary_currency)")
            .eq("applicant_id", p.id)
            .order("status_updated_at", { ascending: false, nullsFirst: false });
          if (mounted && data) setApps(data as any);
        });
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(channel); };
  }, [user]);

  const filtered = tab === "all" ? apps : apps.filter(a => a.tracking_status === tab);

  const counts = STATUS_ORDER.reduce((acc, s) => { acc[s] = apps.filter(a => a.tracking_status === s).length; return acc; }, {} as Record<TrackingStatus, number>);

  return (
    <div className="min-h-screen bg-muted/30">
      <Header />
      <main className="container mx-auto px-4 py-6 md:py-10 max-w-5xl">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Applications</h1>
          <p className="text-sm text-muted-foreground mt-1">Track every application in one place.</p>
        </div>

        {/* Stat strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-6">
          {STATUS_ORDER.map(s => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`text-left rounded-xl border bg-card p-3 transition hover:border-primary/40 ${tab === s ? "ring-2 ring-primary/40 border-primary/40" : ""}`}
            >
              <div className="text-2xl font-bold">{counts[s] ?? 0}</div>
              <ApplicationStatusBadge status={s} className="mt-1" />
            </button>
          ))}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="mb-4">
          <TabsList className="overflow-x-auto">
            <TabsTrigger value="all">All ({apps.length})</TabsTrigger>
            {STATUS_ORDER.map(s => (
              <TabsTrigger key={s} value={s} className="capitalize">{s} ({counts[s] ?? 0})</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {loading ? (
          <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-3">
                <Briefcase className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-1">No applications here yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Start applying to jobs and track them in this dashboard.</p>
              <Button onClick={() => navigate("/jobs")}>Browse jobs</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(app => (
              <Card key={app.id} className="hover:shadow-md transition group">
                <CardContent className="p-4 md:p-5 flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/10 to-secondary/10 ring-1 ring-border flex items-center justify-center shrink-0 overflow-hidden">
                    {app.jobs?.company_logo_url
                      ? <img src={app.jobs.company_logo_url} alt="" className="w-full h-full object-cover" />
                      : <Building2 className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0">
                        <h3 className="font-semibold truncate">{app.jobs?.title ?? "Job removed"}</h3>
                        <p className="text-sm text-muted-foreground truncate">{app.jobs?.company_name ?? "—"}</p>
                      </div>
                      <ApplicationStatusBadge status={app.tracking_status} />
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground flex-wrap">
                      {app.jobs?.location && <span>{app.jobs.location}</span>}
                      {app.jobs?.remote && <span className="text-secondary">Remote</span>}
                      {app.jobs && <span>{app.jobs.salary_currency ?? "USD"} {app.jobs.budget_min.toLocaleString()}–{app.jobs.budget_max.toLocaleString()}</span>}
                      <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Updated {formatDistanceToNow(new Date(app.status_updated_at ?? app.created_at), { addSuffix: true })}</span>
                    </div>
                  </div>
                  {app.jobs && (
                    <Button variant="ghost" size="icon" className="opacity-60 group-hover:opacity-100" onClick={() => navigate(`/jobs?j=${app.jobs!.id}`)}>
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
