/**
 * Lightweight SVG Africa logo — accurate continent silhouette with
 * glowing talent-hub nodes connected by an aurora network.
 * Used for low-data mode, mobile, and as the fallback for the 3D logo.
 */
export function AfricaLogoLite({ className = "" }: { className?: string }) {
  // More accurate Africa silhouette — Tunisia → Horn → Cape → West bulge → Morocco
  const AFRICA_D =
    "M118 18 C132 20 144 28 150 40 L162 44 C168 48 170 56 168 64 L160 78 C158 86 162 92 168 98 L176 110 C180 120 178 132 172 142 L162 156 C156 168 158 180 152 192 L142 208 C134 220 122 228 108 230 C96 232 84 226 78 216 L70 202 C64 192 56 184 50 174 L42 158 C36 146 32 132 34 118 L38 100 C40 88 44 78 50 68 L56 56 C60 46 68 38 78 32 L92 24 C100 20 110 17 118 18 Z";

  // Major African talent hubs — positioned on the silhouette
  const HUBS: { cx: number; cy: number; r: number; delay: number; label: string }[] = [
    { cx: 138, cy: 42, r: 2.6, delay: 0, label: "Tunis" },
    { cx: 92, cy: 48, r: 2.4, delay: 0.4, label: "Casablanca" },
    { cx: 118, cy: 66, r: 2.8, delay: 0.8, label: "Cairo" },
    { cx: 70, cy: 102, r: 2.5, delay: 1.2, label: "Dakar" },
    { cx: 96, cy: 118, r: 3.0, delay: 1.6, label: "Lagos" },
    { cx: 148, cy: 122, r: 2.6, delay: 2.0, label: "Addis" },
    { cx: 108, cy: 150, r: 2.5, delay: 2.4, label: "Kinshasa" },
    { cx: 150, cy: 158, r: 2.8, delay: 2.8, label: "Nairobi" },
    { cx: 124, cy: 200, r: 2.6, delay: 3.2, label: "Johannesburg" },
    { cx: 108, cy: 220, r: 2.4, delay: 3.6, label: "Cape Town" },
  ];

  // Network edges between hubs
  const LINKS: [number, number][] = [
    [0, 2], [2, 5], [1, 3], [3, 4], [4, 6], [4, 2],
    [5, 7], [6, 7], [7, 8], [8, 9], [6, 8], [2, 4],
  ];

  return (
    <svg
      viewBox="0 0 220 250"
      className={className}
      role="img"
      aria-label="SkillLink Africa — connected talent across the continent"
    >
      <defs>
        <linearGradient id="africa-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="55%" stopColor="hsl(var(--primary))" stopOpacity="0.92" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
        <linearGradient id="africa-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.4" />
        </linearGradient>
        <radialGradient id="node-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.9" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
        </radialGradient>
        <filter id="node-blur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.4" />
        </filter>
      </defs>

      {/* Outer aura */}
      <path
        d={AFRICA_D}
        fill="url(#africa-fill)"
        opacity="0.15"
        transform="translate(0,0) scale(1.04) translate(-4,-5)"
        filter="url(#node-blur)"
      />

      {/* Continent body */}
      <path d={AFRICA_D} fill="url(#africa-fill)" />

      {/* Rim light */}
      <path
        d={AFRICA_D}
        fill="none"
        stroke="url(#africa-rim)"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />

      {/* Topographic contour lines for depth */}
      <g
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth="0.4"
        opacity="0.18"
      >
        <path d="M70 80 C90 76 130 78 156 90" />
        <path d="M58 120 C90 112 140 116 168 130" />
        <path d="M70 160 C100 154 140 158 162 168" />
        <path d="M90 195 C110 190 130 192 144 200" />
      </g>

      {/* Network edges */}
      <g
        stroke="hsl(var(--secondary))"
        strokeWidth="0.7"
        opacity="0.55"
        fill="none"
      >
        {LINKS.map(([a, b], i) => (
          <line
            key={i}
            x1={HUBS[a].cx}
            y1={HUBS[a].cy}
            x2={HUBS[b].cx}
            y2={HUBS[b].cy}
            strokeDasharray="2 2"
          >
            <animate
              attributeName="stroke-dashoffset"
              from="0"
              to="-12"
              dur="4s"
              repeatCount="indefinite"
            />
          </line>
        ))}
      </g>

      {/* Glowing hub nodes */}
      {HUBS.map((h, i) => (
        <g key={i}>
          <circle cx={h.cx} cy={h.cy} r={h.r * 3} fill="url(#node-glow)" />
          <circle
            cx={h.cx}
            cy={h.cy}
            r={h.r}
            fill="hsl(var(--secondary))"
          >
            <animate
              attributeName="opacity"
              values="0.55;1;0.55"
              dur="2.4s"
              begin={`${h.delay}s`}
              repeatCount="indefinite"
            />
            <animate
              attributeName="r"
              values={`${h.r};${h.r * 1.4};${h.r}`}
              dur="2.4s"
              begin={`${h.delay}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
}
