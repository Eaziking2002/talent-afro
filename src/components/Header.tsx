import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ProfileDropdown from "@/components/navigation/ProfileDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AfricaLogoLite } from "@/components/AfricaLogoLite";

const Header = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    checkAdminStatus();
  }, [user]);

  const checkAdminStatus = async () => {
    if (!user) {
      setIsAdmin(false);
      return;
    }
    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    setIsAdmin(!!data);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-strong">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 transition-transform group-hover:scale-110">
            <AfricaLogoLite className="w-full h-full" />
          </div>
          <span className="font-display text-lg md:text-xl font-bold tracking-tight">
            Skill<span className="text-gradient-emerald">Link</span>
            <span className="text-muted-foreground font-normal hidden sm:inline"> Africa</span>
          </span>
        </Link>

        {/* Desktop Navigation — Max 4 items */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            to="/talents"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Find Talent
          </Link>
          <Link
            to="/jobs"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Find Work
          </Link>
          <Link
            to="/marketplace"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Marketplace
          </Link>
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <Button size="sm" className="bg-aurora text-primary-foreground" asChild>
                <Link to="/employer/dashboard">Post a Job</Link>
              </Button>
              <ThemeToggle />
              <ProfileDropdown isAdmin={isAdmin} />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log In</Link>
              </Button>
              <Button size="default" className="bg-aurora text-primary-foreground shadow-glow" asChild>
                <Link to="/auth?role=talent">Get Started Free</Link>
              </Button>
              <ThemeToggle />
            </>
          )}
        </div>

        {/* Mobile */}
        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <ProfileDropdown isAdmin={isAdmin} />
          ) : (
            <Button size="sm" className="bg-aurora text-primary-foreground" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
