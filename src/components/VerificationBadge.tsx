import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle, Award, Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgeProps {
  level: "unverified" | "basic" | "verified" | "premium";
  trustScore?: number;
  size?: "sm" | "md" | "lg";
  showScore?: boolean;
}

export const VerificationBadge = ({ 
  level, 
  trustScore = 0, 
  size = "md",
  showScore = true 
}: VerificationBadgeProps) => {
  const getBadgeConfig = () => {
    switch (level) {
      case "premium":
        return {
          icon: Award,
          label: "Premium Verified",
          color: "bg-gradient-to-r from-purple-500 to-pink-500 text-white border-transparent",
          description: "Premium verified employer with excellent track record",
        };
      case "verified":
        return {
          icon: CheckCircle,
          label: "Verified",
          color: "bg-primary text-primary-foreground border-transparent",
          description: "Identity and business verified by our team",
        };
      case "basic":
        return {
          icon: Shield,
          label: "Basic Verified",
          color: "bg-secondary text-secondary-foreground border-transparent",
          description: "Basic verification completed",
        };
      default:
        return {
          icon: Shield,
          label: "Unverified",
          color: "bg-muted text-muted-foreground",
          description: "Not yet verified",
        };
    }
  };

  const config = getBadgeConfig();
  const Icon = config.icon;
  
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const getTrustScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-2">
            <Badge className={`${config.color} ${sizeClasses[size]} inline-flex items-center gap-1`}>
              <Icon size={iconSizes[size]} />
              {config.label}
            </Badge>
            {showScore && trustScore > 0 && (
              <div className={`inline-flex items-center gap-1 ${getTrustScoreColor(trustScore)} font-semibold`}>
                <Star size={iconSizes[size]} fill="currentColor" />
                <span className={sizeClasses[size]}>{trustScore}</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-medium">{config.description}</p>
            {showScore && trustScore > 0 && (
              <p className="text-xs text-muted-foreground">Trust Score: {trustScore}/100</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};