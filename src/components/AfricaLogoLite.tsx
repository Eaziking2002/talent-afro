/**
 * Lightweight SVG Africa logo with glowing nodes.
 * Used for low-data mode, mobile, and as a fallback for the 3D version.
 */
export function AfricaLogoLite({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 240"
      className={className}
      role="img"
      aria-label="SkillLink Africa — connected talent across the continent"
    >
      <defs>
        <linearGradient id="africa-fill" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" />
        </linearGradient>
        <radialGradient id="node-glow">
          <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="1" />
          <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Simplified Africa silhouette */}
      <path
        d="M95 12 C75 14 60 28 55 48 C50 60 42 70 38 86 C34 102 30 116 36 132 C40 148 48 160 56 174 C62 188 70 200 82 214 C92 226 108 232 120 224 C132 216 138 200 142 186 C148 172 156 162 162 148 C168 130 170 110 164 92 C160 76 152 64 144 50 C136 36 124 22 110 16 C105 13 100 12 95 12 Z"
        fill="url(#africa-fill)"
        opacity="0.92"
      />
      <path
        d="M95 12 C75 14 60 28 55 48 C50 60 42 70 38 86 C34 102 30 116 36 132 C40 148 48 160 56 174 C62 188 70 200 82 214 C92 226 108 232 120 224 C132 216 138 200 142 186 C148 172 156 162 162 148 C168 130 170 110 164 92 C160 76 152 64 144 50 C136 36 124 22 110 16 C105 13 100 12 95 12 Z"
        fill="none"
        stroke="hsl(var(--secondary))"
        strokeWidth="1"
        opacity="0.5"
      />

      {/* Connecting lines */}
      <g stroke="hsl(var(--secondary))" strokeWidth="0.6" opacity="0.5" fill="none">
        <line x1="80" y1="50" x2="120" y2="90" />
        <line x1="120" y1="90" x2="70" y2="130" />
        <line x1="70" y1="130" x2="130" y2="160" />
        <line x1="130" y1="160" x2="100" y2="200" />
        <line x1="80" y1="50" x2="70" y2="130" />
      </g>

      {/* Glowing nodes — major cities */}
      {[
        [80, 50],
        [120, 90],
        [70, 130],
        [130, 160],
        [100, 200],
        [110, 70],
        [90, 110],
      ].map(([cx, cy], i) => (
        <g key={i}>
          <circle cx={cx} cy={cy} r="8" fill="url(#node-glow)" />
          <circle cx={cx} cy={cy} r="2.5" fill="hsl(var(--secondary))">
            <animate
              attributeName="opacity"
              values="0.5;1;0.5"
              dur={`${2 + (i % 3)}s`}
              repeatCount="indefinite"
            />
          </circle>
        </g>
      ))}
    </svg>
  );
}
