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
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60 safe-area-bottom">
      <div className="flex items-end justify-around h-[68px] px-1 pb-1">
        {tabs.map((tab) => (
          <Link
            key={tab.label}
            to={tab.to}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 min-w-[60px] rounded-xl transition-all duration-200",
              tab.isPrimary
                ? "relative -mt-4"
                : tab.active
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.isPrimary ? (
              <div className="w-[52px] h-[52px] rounded-2xl bg-hero-gradient flex items-center justify-center shadow-lg shadow-primary/25 ring-4 ring-background">
                <tab.icon className="w-6 h-6 text-primary-foreground" strokeWidth={2.5} />
              </div>
            ) : (
              <div className={cn(
                "flex items-center justify-center w-10 h-10 rounded-xl transition-colors",
                tab.active && "bg-primary/10"
              )}>
                <tab.icon className={cn("w-[22px] h-[22px]", tab.active && "stroke-[2.5]")} />
              </div>
            )}
            <span
              className={cn(
                "text-[10px] leading-tight",
                tab.isPrimary ? "mt-0.5 font-semibold text-primary" : tab.active ? "font-semibold" : "font-medium"
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
