import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Circle, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Item { label: string; done: boolean; }

export default function ProfileCompletionWidget() {
  const { user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("full_name, bio, location, skills, portfolio_links, video_intro_url")
        .eq("user_id", user.id)
        .maybeSingle();

      const skills = Array.isArray(p?.skills) ? (p!.skills as unknown[]) : [];
      const links = Array.isArray(p?.portfolio_links) ? (p!.portfolio_links as unknown[]) : [];
      setItems([
        { label: "Full name", done: !!p?.full_name },
        { label: "Bio", done: !!p?.bio && p.bio.length > 20 },
        { label: "Location", done: !!p?.location },
        { label: "Skills (3+)", done: skills.length >= 3 },
        { label: "Portfolio link", done: links.length > 0 },
        { label: "Video intro", done: !!p?.video_intro_url },
      ]);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return null;
  const done = items.filter(i => i.done).length;
  const pct = Math.round((done / items.length) * 100);

  return (
    <Card className="overflow-hidden border-border/60">
      <div className="h-1 bg-gradient-to-r from-primary to-secondary" />
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <h3 className="font-display font-semibold text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-secondary" />
              Profile strength
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">A complete profile gets 5× more views</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-display font-bold text-gradient-aurora">{pct}%</div>
            <div className="text-[11px] text-muted-foreground">{done}/{items.length} complete</div>
          </div>
        </div>
        <Progress value={pct} className="h-1.5 mb-4" />
        <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 mb-4">
          {items.map(it => (
            <div key={it.label} className={cn("flex items-center gap-1.5 text-xs", it.done ? "text-foreground" : "text-muted-foreground")}>
              {it.done
                ? <CheckCircle2 className="h-3.5 w-3.5 text-secondary shrink-0" />
                : <Circle className="h-3.5 w-3.5 shrink-0" />}
              <span className={cn(it.done && "line-through opacity-70")}>{it.label}</span>
            </div>
          ))}
        </div>
        {pct < 100 && (
          <Button size="sm" variant="outline" asChild className="w-full">
            <Link to="/profile-setup">Complete your profile</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
