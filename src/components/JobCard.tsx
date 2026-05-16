import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, DollarSign, Star, ExternalLink, Bookmark, Clock, Calendar, Globe2, Sparkles, BadgeCheck } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useJobBookmark } from "@/hooks/useJobBookmark";
import { useJobView } from "@/hooks/useJobView";
import { useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import SocialShare from "@/components/SocialShare";
import { cn } from "@/lib/utils";

interface JobCardProps {
  job: {
    id: string;
    title: string;
    company_name: string | null;
    description: string;
    location: string | null;
    budget_min: number;
    budget_max: number;
    required_skills: Json | null;
    remote: boolean | null;
    is_featured: boolean | null;
    ai_scraped: boolean | null;
    external_url: string | null;
    job_type?: string | null;
    expires_at?: string | null;
    date_posted?: string | null;
    created_at?: string;
    visa_sponsorship?: boolean | null;
    ai_match_score?: number | null;
    employers?: {
      company_name: string;
      verification_level?: "unverified" | "basic" | "verified" | "premium";
      trust_score?: number;
    };
  };
  onApply: () => void;
}

export const JobCard = ({ job, onApply }: JobCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { isBookmarked, loading: bookmarkLoading, toggleBookmark } = useJobBookmark(job.id);

  useJobView(job.id, isExpanded);

  const companyName = job.company_name || job.employers?.company_name || "Company";
  const initials = companyName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  const verified = job.employers?.verification_level && job.employers.verification_level !== "unverified";

  const skills: string[] = Array.isArray(job.required_skills) ? (job.required_skills as string[]) : [];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-border/60 backdrop-blur-sm transition-all duration-300",
        "hover:shadow-elevated hover:-translate-y-0.5 hover:border-primary/30",
        job.is_featured && "ring-1 ring-secondary/30"
      )}
    >
      {job.is_featured && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-primary via-secondary to-primary opacity-80" />
      )}

      <CardContent className="p-4 md:p-5">
        {/* Header row: logo + title + save */}
        <div className="flex items-start gap-3 mb-3">
          <div className="h-11 w-11 shrink-0 rounded-xl bg-gradient-to-br from-primary/15 to-secondary/15 ring-1 ring-border/60 grid place-items-center font-display font-bold text-sm text-primary">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-base md:text-[17px] font-display font-semibold leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                {job.title}
              </h3>
              <button
                onClick={toggleBookmark}
                disabled={bookmarkLoading}
                aria-label={isBookmarked ? "Remove bookmark" : "Save job"}
                className={cn(
                  "shrink-0 h-8 w-8 rounded-full grid place-items-center transition-colors",
                  isBookmarked ? "bg-secondary/15 text-secondary" : "hover:bg-muted text-muted-foreground"
                )}
              >
                <Bookmark className={cn("h-4 w-4", isBookmarked && "fill-current")} />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1 text-sm text-muted-foreground">
              <span className="font-medium text-foreground/80">{companyName}</span>
              {verified && (
                <VerificationBadge
                  level={job.employers!.verification_level!}
                  trustScore={job.employers!.trust_score ?? 0}
                  size="sm"
                  showScore={false}
                />
              )}
            </div>
          </div>
        </div>

        {/* Meta badges */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          {job.is_featured && (
            <Badge className="gap-1 text-xs bg-gradient-to-r from-primary/15 to-secondary/15 text-primary border-primary/20">
              <Star className="h-3 w-3 fill-current" /> Featured
            </Badge>
          )}
          {job.remote && (
            <Badge variant="outline" className="text-xs gap-1 border-secondary/40 text-secondary">
              <Globe2 className="h-3 w-3" /> Remote
            </Badge>
          )}
          {job.job_type && (
            <Badge variant="outline" className="text-xs capitalize">{job.job_type.replace("-", " ")}</Badge>
          )}
          {job.visa_sponsorship && (
            <Badge variant="outline" className="text-xs gap-1 border-primary/40 text-primary">
              <BadgeCheck className="h-3 w-3" /> Visa sponsor
            </Badge>
          )}
          {typeof job.ai_match_score === "number" && job.ai_match_score > 0 && (
            <Badge className="text-xs gap-1 bg-secondary/15 text-secondary border-0">
              <Sparkles className="h-3 w-3" /> {job.ai_match_score}% match
            </Badge>
          )}
        </div>

        {/* Salary + location */}
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            {job.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {job.location}
              </span>
            )}
            {(job.date_posted || job.created_at) && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {new Date(job.date_posted || job.created_at || "").toLocaleDateString()}
              </span>
            )}
            {job.expires_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> Closes {new Date(job.expires_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1 text-primary font-display font-bold">
            <DollarSign className="h-4 w-4" />
            <span className="text-lg leading-none">{job.budget_min.toLocaleString()}</span>
            <span className="text-sm text-muted-foreground font-medium">– {job.budget_max.toLocaleString()}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.slice(0, 5).map((skill, i) => (
              <Badge key={i} variant="secondary" className="text-xs font-normal bg-muted/60">{skill}</Badge>
            ))}
            {skills.length > 5 && <Badge variant="secondary" className="text-xs">+{skills.length - 5}</Badge>}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => { setIsExpanded(true); onApply(); }}
            className="bg-aurora text-primary-foreground hover:opacity-95 shadow-sm"
          >
            Apply Now
          </Button>
          <SocialShare
            title={`${job.title} at ${companyName}`}
            description={`Check out this job: ${job.title} – $${job.budget_min}-${job.budget_max}`}
          />
          {job.external_url && (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground ml-auto">
              <a href={job.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Source
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
