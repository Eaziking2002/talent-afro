import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Recommendation {
  job_id: string;
  match_score: number;
  reason: string;
}

interface Job {
  id: string;
  title: string;
  company_name: string | null;
  budget_min: number;
  budget_max: number;
}

export const AIRecommendationsWidget = ({ profileId }: { profileId: string }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [jobs, setJobs] = useState<Map<string, Job>>(new Map());
  const [error, setError] = useState(false);

  const fetch = async () => {
    setLoading(true);
    setError(false);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("job-recommendations", {
        body: { profileId },
      });
      if (fnErr) throw fnErr;

      const recommendations = data?.recommendations || [];
      setRecs(recommendations.slice(0, 3));

      const ids = recommendations.map((r: Recommendation) => r.job_id);
      if (ids.length > 0) {
        const { data: jd } = await supabase.from("jobs").select("id, title, company_name, budget_min, budget_max").in("id", ids);
        setJobs(new Map((jd || []).map((j) => [j.id, j])));
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const getColor = (s: number) => (s >= 80 ? "bg-green-500/10 text-green-700" : s >= 60 ? "bg-yellow-500/10 text-yellow-700" : "bg-muted text-muted-foreground");

  return (
    <Card className="border-dashed">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" /> AI Job Matches
          </CardTitle>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={fetch} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            {recs.length === 0 ? "Get" : "Refresh"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {error && <p className="text-xs text-muted-foreground text-center py-2">Couldn't load — try again later</p>}
        {!error && recs.length === 0 && !loading && (
          <p className="text-xs text-muted-foreground text-center py-2">Click Get to see your AI job matches</p>
        )}
        {recs.length > 0 && (
          <div className="space-y-2">
            {recs.map((r) => {
              const j = jobs.get(r.job_id);
              if (!j) return null;
              return (
                <button
                  key={r.job_id}
                  onClick={() => navigate(`/jobs?job=${j.id}`)}
                  className="w-full text-left rounded-lg p-2.5 hover:bg-muted/50 transition-colors border border-transparent hover:border-border"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium truncate">{j.title}</p>
                    <Badge variant="outline" className={`text-[10px] shrink-0 ${getColor(r.match_score)}`}>
                      {r.match_score}%
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">{j.company_name || "Company"}</p>
                </button>
              );
            })}
            <Button
              size="sm"
              variant="link"
              className="w-full text-xs"
              onClick={() => navigate("/dashboard")}
            >
              View all recommendations →
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
