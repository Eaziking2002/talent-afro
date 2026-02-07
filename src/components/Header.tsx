import { Button } from "@/components/ui/button";
import { Rss } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ProfileDropdown from "@/components/navigation/ProfileDropdown";

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
      .single();
    setIsAdmin(!!data);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-hero-gradient shadow-md">
            <Rss className="w-5 h-5 text-primary-foreground bg-primary" />
          </div>
          <span className="text-xl font-bold">
            Skill<span className="text-primary">Link</span> Africa
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
              <Button variant="hero" size="sm" asChild>
                <Link to="/employer/dashboard">Post a Job</Link>
              </Button>
              <ProfileDropdown isAdmin={isAdmin} />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Log In</Link>
              </Button>
              <Button variant="hero" size="default" asChild>
                <Link to="/auth?role=talent">Get Started Free</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile — only show logo + CTA, bottom nav handles the rest */}
        <div className="md:hidden flex items-center gap-2">
          {user ? (
            <ProfileDropdown isAdmin={isAdmin} />
          ) : (
            <Button variant="hero" size="sm" asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
