import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import ProfileDropdown from "@/components/navigation/ProfileDropdown";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useDataSaverMode } from "@/hooks/useDataSaverMode";
import { Zap, ZapOff } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogo";

const Header = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const { enabled: dataSaver, toggle: toggleDataSaver } = useDataSaverMode();

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
        <BrandLogo asLink size="md" />

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
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleDataSaver}
            title={dataSaver ? "Data saver on — tap to disable" : "Enable data saver"}
            aria-label="Toggle data saver"
          >
            {dataSaver ? <ZapOff className="h-4 w-4 text-secondary" /> : <Zap className="h-4 w-4" />}
          </Button>
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
          <Button variant="ghost" size="icon" onClick={toggleDataSaver} aria-label="Toggle data saver">
            {dataSaver ? <ZapOff className="h-4 w-4 text-secondary" /> : <Zap className="h-4 w-4" />}
          </Button>
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
