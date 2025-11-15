import { Button } from "@/components/ui/button";
import { Menu, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-hero-gradient shadow-md">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">
            Skill<span className="text-primary">Link</span> Africa
          </span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
          {user && (
            <>
              <Link to="/payment-dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Payments
              </Link>
              <Link to="/wallet" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Wallet
              </Link>
            </>
          )}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {user ? (
            <>
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button variant="ghost" onClick={signOut}>Sign Out</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link to="/auth">Log In</Link>
              </Button>
              <Button variant="default" asChild>
                <Link to="/auth">Sign Up</Link>
              </Button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 px-4 flex flex-col gap-4">
            <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
            <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
            {user && (
              <>
                <Link to="/payment-dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Payments
                </Link>
                <Link to="/wallet" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Wallet
                </Link>
              </>
            )}
            <div className="flex flex-col gap-2 pt-4 border-t">
              {user ? (
                <>
                  <span className="text-sm text-muted-foreground px-3">
                    {user.email}
                  </span>
                  <Button variant="ghost" className="w-full" onClick={signOut}>Sign Out</Button>
                </>
              ) : (
                <>
                  <Button variant="ghost" className="w-full" asChild>
                    <Link to="/auth">Log In</Link>
                  </Button>
                  <Button variant="default" className="w-full" asChild>
                    <Link to="/auth">Sign Up</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
