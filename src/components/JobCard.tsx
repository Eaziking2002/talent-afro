import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, DollarSign, Star, ExternalLink, Bookmark } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useJobBookmark } from "@/hooks/useJobBookmark";
import { useJobView } from "@/hooks/useJobView";
import { useState } from "react";
import type { Json } from "@/integrations/supabase/types";
import SocialShare from "@/components/SocialShare";

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

  const getSkills = (): string[] => {
    if (!job.required_skills) return [];
    if (Array.isArray(job.required_skills)) return job.required_skills as string[];
    return [];
  };

  const skills = getSkills();

  return (
    <Card className={`transition-all hover:shadow-card-hover ${job.is_featured ? "border-primary/40 bg-primary/[0.02]" : ""}`}>
      <CardContent className="p-4 md:p-5">
        {/* Top row: badges */}
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          {job.is_featured && (
            <Badge className="gap-1 text-xs bg-primary/10 text-primary border-primary/20 hover:bg-primary/15">
              <Star className="h-3 w-3 fill-current" />
              Featured
            </Badge>
          )}
          {job.remote && <Badge variant="outline" className="text-xs">Remote</Badge>}
          {job.ai_scraped && <Badge variant="secondary" className="text-xs">Verified</Badge>}
        </div>

        {/* Title + budget row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base md:text-lg font-semibold leading-snug line-clamp-2">{job.title}</h3>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Briefcase className="h-3.5 w-3.5" />
                {companyName}
                {job.employers?.verification_level && job.employers?.trust_score !== undefined && (
                  <VerificationBadge level={job.employers.verification_level} trustScore={job.employers.trust_score} size="sm" showScore={false} />
                )}
              </span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {job.location}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="flex items-center gap-0.5 text-lg font-bold text-primary">
              <DollarSign className="h-4 w-4" />
              {job.budget_min.toLocaleString()} – {job.budget_max.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">USD</p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {skills.slice(0, 5).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs font-normal">{skill}</Badge>
            ))}
            {skills.length > 5 && (
              <Badge variant="outline" className="text-xs font-normal">+{skills.length - 5}</Badge>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            onClick={() => { setIsExpanded(true); onApply(); }}
          >
            Apply Now
          </Button>
          <Button
            variant={isBookmarked ? "secondary" : "outline"}
            size="icon"
            className="h-8 w-8"
            onClick={toggleBookmark}
            disabled={bookmarkLoading}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
          </Button>
          <SocialShare
            title={`${job.title} at ${companyName}`}
            description={`Check out this job: ${job.title} – $${job.budget_min}-${job.budget_max}`}
          />
          {job.external_url && (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground">
              <a href={job.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                Source
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
