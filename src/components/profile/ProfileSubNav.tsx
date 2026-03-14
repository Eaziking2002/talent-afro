import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Award, Shield, Wallet, Settings } from "lucide-react";

interface ProfileSubNavProps {
  isOwner: boolean;
}

const ProfileSubNav = ({ isOwner }: ProfileSubNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  if (!isOwner) return null;

  const tabs = [
    { label: "Certifications", icon: Award, path: "/certifications" },
    { label: "Verification", icon: Shield, path: "/verification" },
    { label: "Wallet", icon: Wallet, path: "/wallet" },
    { label: "Settings", icon: Settings, path: "/profile-setup" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const active = location.pathname === tab.path;
        return (
          <Button
            key={tab.path}
            size="sm"
            variant={active ? "default" : "outline"}
            className="gap-1.5 text-xs"
            onClick={() => navigate(tab.path)}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}
          </Button>
        );
      })}
    </div>
  );
};

export default ProfileSubNav;
