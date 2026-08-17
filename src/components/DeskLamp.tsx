import { cn } from "@/lib/utils";

export type LampState = "off" | "warm" | "on";

interface DeskLampProps {
  state: LampState;
  className?: string;
}

export function DeskLamp({ state, className }: DeskLampProps) {
  const isOff = state === "off";
  const isWarm = state === "warm";
  const isOn = state === "on";

  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const dur = prefersReducedMotion ? "0ms" : "650ms";
  const t = `all ${dur} ease-in-out`;

  // Colors
  const bodyColor = isOff ? "#1B2C42" : isWarm ? "#243650" : "#2E4A6A";
  const domeColor = isOff ? "#1E3050" : isWarm ? "#7A5C1E" : "#C8881A";
  const domeInner = isOff ? "#161E2E" : isWarm ? "#5A4010" : "#E8A830";
  const rimColor = isOff ? "#253248" : isWarm ? "#9A7828" : "#F0B840";
  const bulbOpacity = isOff ? 0 : isWarm ? 0.45 : 1;
  const coneOpacity = isOff ? 0 : isWarm ? 0.08 : 0.3;
  const glowOpacity = isOff ? 0 : isWarm ? 0.18 : 0.5;
  const beadColor = isOff ? "#F5A623" : isWarm ? "#F5A623" : "#FFD080";

  return (
    <div
      className={cn("relative select-none", className)}
      aria-hidden="true"
      role="presentation"
    >
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 55% at 50% 38%, rgba(245,166,35,${glowOpacity}), transparent 70%)`,
          filter: "blur(22px)",
          transition: `background ${dur} ease`,
        }}
      />

      <svg
        viewBox="0 0 200 280"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          {/* Light cone below dome */}
          <radialGradient id="coneGrad" cx="50%" cy="0%" r="100%" fx="50%" fy="0%">
            <stop offset="0%" stopColor="#F5C86E" stopOpacity={coneOpacity} />
            <stop offset="100%" stopColor="#F5C86E" stopOpacity="0" />
          </radialGradient>
          {/* Bulb glow inside dome */}
          <radialGradient id="bulbGrad" cx="50%" cy="80%" r="60%">
            <stop offset="0%" stopColor="#FFF0C0" stopOpacity={bulbOpacity} />
            <stop offset="50%" stopColor="#F5C86E" stopOpacity={bulbOpacity * 0.7} />
            <stop offset="100%" stopColor="#D4922C" stopOpacity="0" />
          </radialGradient>
          {/* Dome inner glow */}
          <radialGradient id="domeGlow" cx="50%" cy="100%" r="70%">
            <stop offset="0%" stopColor="#F5C86E" stopOpacity={isOn ? 0.35 : isWarm ? 0.1 : 0} />
            <stop offset="100%" stopColor="#F5C86E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── LIGHT CONE (emitted downward from dome opening) ── */}
        <ellipse
          cx="100" cy="148"
          rx={isOn ? 70 : isWarm ? 40 : 0}
          ry={isOn ? 80 : isWarm ? 45 : 0}
          fill="url(#coneGrad)"
          style={{ transition: t }}
        />

        {/* ── BASE ── */}
        <rect
          x="50" y="255" width="100" height="14" rx="7"
          fill={bodyColor}
          style={{ transition: t }}
        />
        <ellipse
          cx="100" cy="269" rx="52" ry="7"
          fill={bodyColor} opacity="0.5"
        />

        {/* ── STEM ── */}
        <rect
          x="93" y="148" width="14" height="110" rx="7"
          fill={bodyColor}
          style={{ transition: t }}
        />

        {/* ── DOME SHADE (hemisphere/mushroom) ── */}
        {/* Main dome shape — ellipse arc top half */}
        <path
          d="M 38 148 Q 38 68 100 68 Q 162 68 162 148 Z"
          fill={domeColor}
          style={{ transition: t }}
        />
        {/* Inner dome glow */}
        <path
          d="M 38 148 Q 38 68 100 68 Q 162 68 162 148 Z"
          fill="url(#domeGlow)"
          style={{ transition: t }}
        />
        {/* Dome highlight (top specular) */}
        <ellipse
          cx="84" cy="90" rx="18" ry="10"
          fill="rgba(255,255,255,0.06)"
          transform="rotate(-20, 84, 90)"
        />
        {/* Dome opening rim (bottom edge) */}
        <ellipse
          cx="100" cy="148" rx="62" ry="10"
          fill={rimColor}
          style={{
            transition: t,
            filter: isOn ? "brightness(1.25)" : "none",
          }}
        />
        {/* Dome opening inner rim (dark inside edge) */}
        <ellipse
          cx="100" cy="148" rx="55" ry="7"
          fill={domeInner}
          style={{ transition: t }}
        />

        {/* ── BULB GLOW (inside dome, near opening) ── */}
        <ellipse
          cx="100" cy="144" rx="30" ry="18"
          fill="url(#bulbGrad)"
          style={{ transition: t }}
        />

        {/* ── PULL CHAIN BEAD ── */}
        {/* Chain line */}
        <line
          x1="100" y1="148" x2="100" y2="168"
          stroke={bodyColor}
          strokeWidth="1.5"
          strokeDasharray="3 2"
          style={{ transition: t }}
        />
        {/* Bead */}
        <circle
          cx="100" cy="172" r="5"
          fill={beadColor}
          style={{ transition: t }}
        />
        {/* Bead shine */}
        <circle
          cx="98" cy="170" r="1.5"
          fill="rgba(255,255,255,0.4)"
        />
      </svg>
    </div>
  );
}
