import { Link, useLocation } from "react-router-dom";
import { Home, Search, Briefcase, Users, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (paths: string[]) => paths.some(p => currentPath === p || currentPath.startsWith(p + "/"));

  const tabs = [
    {
      label: "Home",
      icon: Home,
      to: "/",
      active: currentPath === "/",
    },
    {
      label: "Jobs",
      icon: Briefcase,
      to: "/jobs",
      active: isActive(["/jobs"]),
    },
    {
      label: "Talents",
      icon: Users,
      to: "/talents",
      active: isActive(["/talents"]),
    },
    {
      label: "Search",
      icon: Search,
      to: "/marketplace",
      active: isActive(["/marketplace"]),
    },
    {
      label: "Profile",
      icon: User,
      to: user ? "/profile" : "/auth",
      active: isActive(["/profile", "/wallet", "/notifications", "/verification", "/profile-setup", "/certifications"]),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            className={cn(
              "flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-lg transition-colors",
              tab.active
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <tab.icon className={cn("w-5 h-5", tab.active && "stroke-[2.5]")} />
            <span className={cn(
              "text-[10px] leading-none",
              tab.active ? "font-semibold" : "font-medium"
            )}>
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
