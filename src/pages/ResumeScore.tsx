import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Gauge, Loader2, ThumbsUp, ThumbsDown, Lightbulb } from "lucide-react";

interface Result {
  overall_score: number;
  ats_score: number;
  clarity_score: number;
  impact_score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  summary: string;
}

export default function ResumeScore() {
  const [cvText, setCvText] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const score = async () => {
    if (cvText.trim().length < 50) { toast.error("Paste at least 50 characters of your CV"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-resume-score", { body: { cvText, targetRole } });
      if (error) throw error;
      if ((data as any).error) throw new Error((data as any).error);
      setResult((data as any).result);
      toast.success("CV scored");
    } catch (e: any) {
      toast.error(e.message || "Failed to score");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-display font-bold flex items-center gap-2">
          <Gauge className="h-7 w-7 text-secondary" /> AI Resume Scoring
        </h1>
        <p className="text-muted-foreground mt-1 mb-6">Get an instant ATS-friendly score with strengths, weaknesses, and concrete fixes.</p>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass">
            <CardHeader><CardTitle>Your CV</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div><Label>Target role (optional)</Label><Input value={targetRole} onChange={e => setTargetRole(e.target.value)} placeholder="Backend Engineer" /></div>
              <div><Label>Paste your CV text</Label>
                <Textarea rows={14} value={cvText} onChange={e => setCvText(e.target.value)} placeholder="Paste full CV content here..." />
              </div>
              <Button onClick={score} disabled={loading} className="w-full bg-emerald-gradient">
                {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Scoring...</> : <>Score my CV</>}
              </Button>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader><CardTitle>Results</CardTitle></CardHeader>
            <CardContent>
              {!result && <p className="text-muted-foreground text-sm">Run the analysis to see your scores.</p>}
              {result && (
                <div className="space-y-4">
                  <div>
                    <div className="flex items-baseline justify-between"><span className="text-sm text-muted-foreground">Overall</span><span className="text-3xl font-bold text-secondary">{result.overall_score}</span></div>
                    <Progress value={result.overall_score} className="mt-1" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-md border p-2"><div className="text-muted-foreground">ATS</div><div className="font-bold text-lg">{result.ats_score}</div></div>
                    <div className="rounded-md border p-2"><div className="text-muted-foreground">Clarity</div><div className="font-bold text-lg">{result.clarity_score}</div></div>
                    <div className="rounded-md border p-2"><div className="text-muted-foreground">Impact</div><div className="font-bold text-lg">{result.impact_score}</div></div>
                  </div>
                  <p className="text-sm">{result.summary}</p>
                  <Section icon={<ThumbsUp className="h-4 w-4 text-secondary" />} title="Strengths" items={result.strengths} />
                  <Section icon={<ThumbsDown className="h-4 w-4 text-destructive" />} title="Weaknesses" items={result.weaknesses} />
                  <Section icon={<Lightbulb className="h-4 w-4 text-primary" />} title="Suggestions" items={result.suggestions} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

const Section = ({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) => (
  <div>
    <h3 className="text-sm font-semibold flex items-center gap-1.5 mb-1">{icon} {title}</h3>
    <ul className="text-sm space-y-1 list-disc pl-5 text-muted-foreground">
      {items.map((it, i) => <li key={i}>{it}</li>)}
    </ul>
  </div>
);
