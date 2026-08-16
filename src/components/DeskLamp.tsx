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

  // Reduced motion support
  const prefersReducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const tx = prefersReducedMotion ? "0ms" : "700ms";
  const ts = (extra = "") =>
    `all ${tx} ease-in-out${extra ? ", " + extra : ""}`;

  // Metal parts
  const metalFill = isOff ? "#1B2C42" : "#243650";
  const metalStroke = isOff ? "#1B2C42" : "#243650";

  // Shade
  const shadeFill = isOff ? "#1A2B40" : isWarm ? "#6B500F" : "#B87C10";
  const shadeRim = isOff ? "#1E3050" : isWarm ? "#8A6818" : "#D4952A";

  // Bulb
  const bulbOpacity = isOff ? 0 : isWarm ? 0.5 : 1;

  // Light cone and ambient glow
  const coneOpacity = isOff ? 0 : isWarm ? 0.1 : 0.28;
  const glowOpacity = isOff ? 0 : isWarm ? 0.14 : 0.42;

  return (
    <div
      className={cn("relative select-none", className)}
      aria-hidden="true"
      role="presentation"
    >
      {/* Ambient glow behind SVG */}
      <div
        className="absolute inset-0 pointer-events-none rounded-full"
        style={{
          background: `radial-gradient(ellipse 80% 60% at 55% 30%, rgba(245,166,35,${glowOpacity}), transparent 70%)`,
          filter: "blur(28px)",
          transition: `opacity ${tx} ease`,
        }}
      />

      <svg
        viewBox="0 0 180 300"
        xmlns="http://www.w3.org/2000/svg"
        className="relative z-10 w-full h-full"
        aria-hidden="true"
      >
        <defs>
          {/* Cone of light below shade */}
          <linearGradient id="lampConeGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F5C86E" stopOpacity={coneOpacity} />
            <stop offset="85%" stopColor="#F5C86E" stopOpacity="0" />
          </linearGradient>
          {/* Bulb radial glow */}
          <radialGradient id="lampBulbGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFF0C0" stopOpacity={bulbOpacity} />
            <stop offset="55%" stopColor="#F5C86E" stopOpacity={bulbOpacity * 0.65} />
            <stop offset="100%" stopColor="#D4922C" stopOpacity="0" />
          </radialGradient>
          {/* Inner shade glow when on */}
          <radialGradient id="lampShadeGlow" cx="50%" cy="100%" r="80%">
            <stop offset="0%" stopColor="#F5C86E" stopOpacity={isOn ? 0.25 : 0} />
            <stop offset="100%" stopColor="#F5C86E" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── LIGHT CONE (emitted below shade) ── */}
        <path
          d="M 60 112 L 16 260 L 148 260 Z"
          fill="url(#lampConeGrad)"
          style={{ transition: ts() }}
        />

        {/* ── BASE ── */}
        <rect
          x="38" y="270" width="104" height="16" rx="8"
          fill={metalFill}
          style={{ transition: ts() }}
        />
        <ellipse
          cx="90" cy="286" rx="54" ry="8"
          fill={metalFill} opacity="0.45"
        />

        {/* ── VERTICAL POLE ── */}
        <rect
          x="83" y="158" width="14" height="116" rx="7"
          fill={metalFill}
          style={{ transition: ts() }}
        />

        {/* ── SHOULDER JOINT ── */}
        <circle
          cx="90" cy="158" r="9"
          fill={metalFill}
          style={{ transition: ts() }}
        />

        {/* ── UPPER ARM ── */}
        <line
          x1="90" y1="158" x2="80" y2="116"
          stroke={metalStroke} strokeWidth="11" strokeLinecap="round"
          style={{ transition: ts() }}
        />

        {/* ── ELBOW JOINT ── */}
        <circle
          cx="80" cy="116" r="8"
          fill={metalFill}
          style={{ transition: ts() }}
        />

        {/* ── LOWER ARM (elbow to shade) ── */}
        <line
          x1="80" y1="116" x2="89" y2="90"
          stroke={metalStroke} strokeWidth="9" strokeLinecap="round"
          style={{ transition: ts() }}
        />

        {/* ── WRIST JOINT ── */}
        <circle
          cx="89" cy="90" r="6.5"
          fill={metalFill}
          style={{ transition: ts() }}
        />

        {/* ── SHADE (trapezoid, opening downward) ── */}
        <path
          d="M 54 90 L 42 116 L 138 116 L 126 90 Z"
          fill={shadeFill}
          style={{ transition: ts() }}
        />
        {/* Inner shade glow overlay */}
        <path
          d="M 54 90 L 42 116 L 138 116 L 126 90 Z"
          fill="url(#lampShadeGlow)"
          style={{ transition: ts() }}
        />
        {/* Shade top ridge */}
        <rect
          x="52" y="87" width="76" height="7" rx="3.5"
          fill={shadeRim}
          style={{ transition: ts() }}
        />
        {/* Shade bottom rim */}
        <rect
          x="40" y="113" width="100" height="6" rx="3"
          fill={shadeRim}
          style={{
            filter: isOn ? "brightness(1.3)" : "none",
            transition: ts(),
          }}
        />
        {/* Shade highlight (left reflection) */}
        <path
          d="M 56 92 L 48 114 L 64 114 L 70 92 Z"
          fill="rgba(255,255,255,0.045)"
        />

        {/* ── BULB ── */}
        <ellipse
          cx="90" cy="105" rx="16" ry="11"
          fill="url(#lampBulbGrad)"
          style={{ transition: ts() }}
        />

        {/* ── PULL CHAIN (subtle detail) ── */}
        <line
          x1="90" y1="120" x2="90" y2="140"
          stroke={metalFill}
          strokeWidth="1.5"
          strokeDasharray="3 3"
          style={{ transition: ts() }}
        />
        <circle
          cx="90" cy="144" r="4"
          fill={metalFill}
          style={{ transition: ts() }}
        />
      </svg>
    </div>
  );
}
