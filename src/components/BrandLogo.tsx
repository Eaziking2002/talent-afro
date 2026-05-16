import { Link } from "react-router-dom";
import { AfricaLogoLite } from "./AfricaLogoLite";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  showWordmark?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  asLink?: boolean;
  tagline?: boolean;
}

const sizeMap = {
  sm: { box: "w-8 h-8", text: "text-base", tag: "text-[10px]" },
  md: { box: "w-10 h-10 md:w-11 md:h-11", text: "text-lg md:text-xl", tag: "text-xs" },
  lg: { box: "w-14 h-14", text: "text-2xl", tag: "text-sm" },
  xl: { box: "w-20 h-20", text: "text-3xl", tag: "text-base" },
};

/**
 * Unified SkillLink Africa brand mark — Africa map icon + wordmark.
 * Use everywhere a logo should appear (header, footer, auth, dashboards, splash).
 */
export function BrandLogo({
  className,
  showWordmark = true,
  size = "md",
  asLink = false,
  tagline = false,
}: BrandLogoProps) {
  const s = sizeMap[size];

  const content = (
    <div className={cn("flex items-center gap-2.5 group", className)}>
      <div
        className={cn(
          "relative rounded-xl overflow-hidden bg-gradient-to-br from-primary/15 to-secondary/15 ring-1 ring-border/50 shadow-sm transition-transform group-hover:scale-105 flex items-center justify-center p-1.5",
          s.box
        )}
      >
        <AfricaLogoLite className="w-full h-full" />
      </div>
      {showWordmark && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-display font-bold tracking-tight", s.text)}>
            <span className="text-foreground">Skill</span>
            <span className="text-gradient-emerald">Link</span>
            <span className="text-muted-foreground font-medium hidden sm:inline"> Africa</span>
          </span>
          {tagline && (
            <span className={cn("text-muted-foreground mt-1", s.tag)}>
              Africa's talent infrastructure
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (asLink) {
    return (
      <Link to="/" aria-label="SkillLink Africa home" className="shrink-0">
        {content}
      </Link>
    );
  }
  return content;
}

/**
 * Animated splash/loader using the Africa map mark — for route transitions
 * and full-page loading states.
 */
export function BrandedLoader({
  label = "Loading…",
  fullscreen = false,
}: {
  label?: string;
  fullscreen?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4",
        fullscreen ? "min-h-screen w-full bg-background" : "py-12"
      )}
    >
      <div className="relative w-20 h-20 animate-pulse">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 blur-xl" />
        <div className="relative w-full h-full">
          <AfricaLogoLite className="w-full h-full drop-shadow-[0_0_18px_hsl(var(--secondary)/0.5)]" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground font-medium tracking-wide">{label}</p>
    </div>
  );
}
