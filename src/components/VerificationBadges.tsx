import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Award, FileText, User } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface VerificationBadgesProps {
  talentId: string;
  inline?: boolean;
}

export function VerificationBadges({ talentId, inline = false }: VerificationBadgesProps) {
  const [badges, setBadges] = useState<any[]>([]);

  useEffect(() => {
    fetchBadges();
  }, [talentId]);

  const fetchBadges = async () => {
    const { data } = await supabase
      .from("verification_badges")
      .select("*")
      .eq("talent_id", talentId);

    if (data) setBadges(data);
  };

  const getBadgeIcon = (type: string) => {
    switch (type) {
      case "identity": return <User className="h-3 w-3" />;
      case "skill": return <Award className="h-3 w-3" />;
      case "portfolio": return <FileText className="h-3 w-3" />;
      case "blue_tick": return <CheckCircle className="h-4 w-4 text-blue-500 fill-blue-500" />;
      default: return <CheckCircle className="h-3 w-3" />;
    }
  };

  const getBadgeColor = (level: string) => {
    switch (level) {
      case "bronze": return "bg-orange-600 hover:bg-orange-700";
      case "silver": return "bg-gray-400 hover:bg-gray-500";
      case "gold": return "bg-yellow-500 hover:bg-yellow-600";
      case "platinum": return "bg-purple-600 hover:bg-purple-700";
      default: return "bg-blue-500 hover:bg-blue-600";
    }
  };

  const getBadgeLabel = (type: string, level?: string) => {
    const typeLabel = type.replace("_", " ");
    return level ? `${level} ${typeLabel}` : typeLabel;
  };

  if (badges.length === 0) return null;

  const blueTickBadge = badges.find(b => b.badge_type === "blue_tick");

  return (
    <TooltipProvider>
      <div className={inline ? "inline-flex items-center gap-1" : "flex items-center gap-2"}>
        {blueTickBadge && (
          <Tooltip>
            <TooltipTrigger>
              <CheckCircle className="h-5 w-5 text-blue-500 fill-blue-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p>Verified Account</p>
            </TooltipContent>
          </Tooltip>
        )}
        
        {badges
          .filter(b => b.badge_type !== "blue_tick")
          .map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger>
                <Badge
                  className={`${getBadgeColor(badge.badge_level || "")} text-white gap-1`}
                >
                  {getBadgeIcon(badge.badge_type)}
                  {!inline && <span className="capitalize text-xs">
                    {badge.badge_level || "Verified"}
                  </span>}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="capitalize">{getBadgeLabel(badge.badge_type, badge.badge_level)}</p>
              </TooltipContent>
            </Tooltip>
          ))}
      </div>
    </TooltipProvider>
  );
}
