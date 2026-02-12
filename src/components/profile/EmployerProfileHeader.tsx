import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2, CheckCircle, Globe, MapPin, Users, MessageSquare, Briefcase,
} from "lucide-react";

interface EmployerHeaderProps {
  employer: {
    company_name: string;
    company_description?: string | null;
    website?: string | null;
    logo_url?: string | null;
    industry?: string | null;
    company_size?: string | null;
    verified?: boolean | null;
    verification_level?: string | null;
    average_rating?: number | null;
    total_reviews?: number | null;
    total_jobs_posted?: number | null;
    successful_hires?: number | null;
    trust_score?: number | null;
  };
  isOwner: boolean;
  onContact?: () => void;
  onPostJob?: () => void;
}

export const EmployerProfileHeader = ({
  employer,
  isOwner,
  onContact,
  onPostJob,
}: EmployerHeaderProps) => {
  const initials = employer.company_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "CO";

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      <div className="h-32 sm:h-40 bg-trust-gradient" />

      <div className="px-4 sm:px-8 pb-6 -mt-16 sm:-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <Avatar className="h-28 w-28 sm:h-32 sm:w-32 border-4 border-card shadow-lg">
            <AvatarImage src={employer.logo_url || undefined} alt={employer.company_name} />
            <AvatarFallback className="text-2xl font-bold bg-muted text-muted-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0 pt-2 sm:pt-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold truncate">{employer.company_name}</h1>
              {employer.verified && (
                <Badge variant="secondary" className="gap-1 w-fit text-xs">
                  <CheckCircle className="h-3 w-3" /> Verified Business
                </Badge>
              )}
              {employer.verification_level && employer.verification_level !== "basic" && (
                <Badge className="w-fit text-xs capitalize">{employer.verification_level}</Badge>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
              {employer.industry && (
                <span className="flex items-center gap-1">
                  <Building2 className="h-3.5 w-3.5" /> {employer.industry}
                </span>
              )}
              {employer.company_size && (
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> {employer.company_size}
                </span>
              )}
              {employer.website && (
                <a
                  href={employer.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-primary transition-colors"
                >
                  <Globe className="h-3.5 w-3.5" /> Website
                </a>
              )}
              {(employer.total_jobs_posted ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Briefcase className="h-3.5 w-3.5" /> {employer.total_jobs_posted} jobs posted
                </span>
              )}
              {(employer.average_rating ?? 0) > 0 && (
                <span>⭐ {Number(employer.average_rating).toFixed(1)} ({employer.total_reviews} reviews)</span>
              )}
            </div>

            {employer.trust_score != null && employer.trust_score > 0 && (
              <div className="mt-2">
                <Badge variant="outline" className="text-xs">Trust Score: {employer.trust_score}/100</Badge>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-2 sm:ml-auto sm:self-start sm:mt-20">
            {isOwner ? (
              <Button size="sm" onClick={onPostJob} className="gap-1.5">
                <Briefcase className="h-4 w-4" /> Post a Job
              </Button>
            ) : (
              <Button size="sm" onClick={onContact} className="gap-1.5">
                <MessageSquare className="h-4 w-4" /> Contact
              </Button>
            )}
          </div>
        </div>

        {employer.company_description && (
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-3xl">
            {employer.company_description}
          </p>
        )}
      </div>
    </div>
  );
};

export const EmployerHeaderSkeleton = () => (
  <div className="bg-card border rounded-xl overflow-hidden">
    <Skeleton className="h-32 sm:h-40 w-full rounded-none" />
    <div className="px-4 sm:px-8 pb-6 -mt-16 sm:-mt-20">
      <div className="flex flex-col sm:flex-row sm:items-end gap-4">
        <Skeleton className="h-28 w-28 sm:h-32 sm:w-32 rounded-full" />
        <div className="flex-1 space-y-2 pt-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
    </div>
  </div>
);
