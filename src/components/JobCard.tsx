import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Briefcase, DollarSign, Star, ExternalLink, Bookmark } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";
import { useJobBookmark } from "@/hooks/useJobBookmark";
import { useJobView } from "@/hooks/useJobView";
import { useState } from "react";
import type { Json } from "@/integrations/supabase/types";

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
  
  // Track view when card is expanded
  useJobView(job.id, isExpanded);

  const getCompanyName = () => {
    return job.company_name || job.employers?.company_name || "Company";
  };

  const getSkills = (): string[] => {
    if (!job.required_skills) return [];
    if (Array.isArray(job.required_skills)) return job.required_skills as string[];
    return [];
  };

  const skills = getSkills();

  return (
    <Card
      className={`hover:shadow-lg transition-all ${
        job.is_featured ? "border-primary border-2" : ""
      }`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {job.is_featured && (
                <Badge variant="default" className="gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  Featured
                </Badge>
              )}
              {job.ai_scraped && (
                <Badge variant="secondary">AI Verified</Badge>
              )}
              {job.remote && (
                <Badge variant="outline">Remote</Badge>
              )}
            </div>
            <CardTitle className="text-2xl mb-1">{job.title}</CardTitle>
            <CardDescription className="flex items-center gap-4 text-base flex-wrap">
              <span className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                {getCompanyName()}
                {job.employers && job.employers.verification_level && job.employers.trust_score !== undefined && (
                  <VerificationBadge
                    level={job.employers.verification_level}
                    trustScore={job.employers.trust_score}
                    size="sm"
                    showScore={false}
                  />
                )}
              </span>
              {job.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </span>
              )}
            </CardDescription>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-2xl font-bold text-primary">
              <DollarSign className="h-5 w-5" />
              {job.budget_min} - {job.budget_max}
            </div>
            <p className="text-sm text-muted-foreground">USD</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4 line-clamp-3">
          {job.description}
        </p>

        {skills.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {skills.slice(0, 6).map((skill, index) => (
              <Badge key={index} variant="outline">
                {skill}
              </Badge>
            ))}
            {skills.length > 6 && (
              <Badge variant="outline">+{skills.length - 6} more</Badge>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            className="flex-1" 
            onClick={() => {
              setIsExpanded(true);
              onApply();
            }}
          >
            Apply Now
          </Button>
          <Button
            variant={isBookmarked ? "default" : "outline"}
            size="icon"
            onClick={toggleBookmark}
            disabled={bookmarkLoading}
          >
            <Bookmark className={`h-4 w-4 ${isBookmarked ? "fill-current" : ""}`} />
          </Button>
          {job.external_url && (
            <Button variant="outline" asChild>
              <a href={job.external_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                View Original
              </a>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};