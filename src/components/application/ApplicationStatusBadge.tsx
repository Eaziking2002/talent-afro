import { Badge } from "@/components/ui/badge";
import { Check, Eye, Star, Calendar, X, Trophy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type TrackingStatus = "submitted" | "viewed" | "shortlisted" | "interview" | "rejected" | "hired" | "withdrawn";

const config: Record<TrackingStatus, { label: string; icon: any; className: string }> = {
  submitted:   { label: "Submitted",   icon: Clock,    className: "bg-muted text-muted-foreground border-border" },
  viewed:      { label: "Viewed",      icon: Eye,      className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  shortlisted: { label: "Shortlisted", icon: Star,     className: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20" },
  interview:   { label: "Interview",   icon: Calendar, className: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20" },
  hired:       { label: "Hired",       icon: Trophy,   className: "bg-secondary/15 text-secondary border-secondary/30" },
  rejected:    { label: "Rejected",    icon: X,        className: "bg-destructive/10 text-destructive border-destructive/20" },
  withdrawn:   { label: "Withdrawn",   icon: X,        className: "bg-muted text-muted-foreground border-border" },
};

export function ApplicationStatusBadge({ status, className }: { status: TrackingStatus; className?: string }) {
  const c = config[status] ?? config.submitted;
  const Icon = c.icon;
  return (
    <Badge variant="outline" className={cn("gap-1 font-medium", c.className, className)}>
      <Icon className="h-3 w-3" />
      {c.label}
    </Badge>
  );
}

export const STATUS_ORDER: TrackingStatus[] = ["submitted", "viewed", "shortlisted", "interview", "hired", "rejected"];
export const STATUS_LABELS = config;
