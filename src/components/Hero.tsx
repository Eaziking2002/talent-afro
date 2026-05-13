import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { lazy, Suspense } from "react";
import { AfricaLogoLite } from "@/components/AfricaLogoLite";

const AfricaLogo3D = lazy(() =>
  import("@/components/AfricaLogo3D").then((m) => ({ default: m.AfricaLogo3D }))
);

const Hero = () => {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Aurora background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-hero-radial" />
        <div className="absolute top-1/4 -left-20 w-96 h-96 rounded-full bg-secondary/20 blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl" />
      </div>

      <div className="container relative px-4 md:px-6 pt-12 pb-16 md:pt-24 md:pb-28">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
          {/* Copy */}
          <div className="space-y-7 animate-fade-up">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-1.5 text-xs md:text-sm font-medium">
              <Sparkles className="w-3.5 h-3.5 text-secondary" />
              <span>Africa's premier talent marketplace</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.05]">
              Built by Africa.
              <br />
              <span className="text-gradient-aurora">Powering the world.</span>
            </h1>

            <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              Connect with verified African talent and remote opportunities worldwide.
              AI-matched, escrow-protected, paid in mobile money or bank — instantly.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button size="xl" className="bg-aurora text-primary-foreground shadow-glow hover:opacity-95 group" asChild>
                <Link to="/auth?role=talent">
                  Find Work
                  <ArrowRight className="ml-2 w-5 h-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="xl" variant="outline" className="glass border-border/60" asChild>
                <Link to="/auth?role=employer">Hire Talent</Link>
              </Button>
            </div>

            {/* Trust strip */}
            <div className="flex flex-wrap gap-6 pt-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-secondary" />
                <span>Verified employers</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-secondary" />
                <span>Instant payouts</span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span>AI talent matching</span>
              </div>
            </div>
          </div>

          {/* 3D Logo */}
          <div className="relative h-[340px] md:h-[460px] lg:h-[540px] animate-scale-in">
            <Suspense fallback={<AfricaLogoLite className="w-full h-full" />}>
              <AfricaLogo3D className="w-full h-full" />
            </Suspense>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 md:gap-6 mt-12 md:mt-20">
          {[
            { value: "12K+", label: "Active talents" },
            { value: "3.5K+", label: "Live opportunities" },
            { value: "54", label: "African countries" },
          ].map((s) => (
            <div key={s.label} className="glass rounded-2xl p-4 md:p-6 text-center">
              <div className="font-display text-2xl md:text-4xl font-bold text-gradient-emerald">
                {s.value}
              </div>
              <div className="text-xs md:text-sm text-muted-foreground mt-1">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Hero;
