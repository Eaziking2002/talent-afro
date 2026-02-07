import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const MobileBottomNav = () => {
  const { user } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const isActive = (path: string) => currentPath === path;

  const tabs = [
    {
      label: "Home",
      icon: Home,
      to: "/",
      active: isActive("/"),
    },
    {
      label: "Jobs",
      icon: Search,
      to: "/jobs",
      active: isActive("/jobs") || isActive("/marketplace"),
    },
    {
      label: "Post",
      icon: PlusCircle,
      to: user ? "/employer/dashboard" : "/auth?role=employer",
      active: false,
      isPrimary: true,
    },
    {
      label: "Messages",
      icon: MessageSquare,
      to: user ? "/messages" : "/auth",
      active: isActive("/messages"),
    },
    {
      label: "Profile",
      icon: User,
      to: user ? "/dashboard" : "/auth",
      active:
        isActive("/dashboard") ||
        isActive("/wallet") ||
        isActive("/notifications") ||
        isActive("/my-services") ||
        isActive("/verification") ||
        isActive("/profile-setup"),
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[56px] py-1 rounded-lg transition-colors",
              tab.isPrimary
                ? "relative -mt-5"
                : tab.active
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {tab.isPrimary ? (
              <div className="w-12 h-12 rounded-full bg-hero-gradient flex items-center justify-center shadow-lg">
                <tab.icon className="w-6 h-6 text-primary-foreground" />
              </div>
            ) : (
              <tab.icon className="w-5 h-5" />
            )}
            <span
              className={cn(
                "text-[10px] font-medium",
                tab.isPrimary && "mt-0.5"
              )}
            >
              {tab.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
