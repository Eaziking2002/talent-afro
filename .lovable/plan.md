# SkillLink Africa — Premium Transformation Plan

You picked everything, so I'll ship in 4 waves. Each wave is reviewable on its own; you approve, I move to the next. This avoids a 50-file mega-PR that breaks things silently.

## Wave 1 — Visual foundation + 3D Africa logo (this turn)

**Design system (`index.css`, `tailwind.config.ts`)**
- New palette: deep blue `#0A1F44`, emerald `#10B981`, soft black `#0F1116`, white accents
- Glassmorphism utilities (`.glass`, `.glass-strong`)
- Premium gradients (`--gradient-aurora`, `--gradient-emerald`, `--gradient-deep`)
- Typography: Inter (body) + Space Grotesk (display) via Google Fonts
- Dark mode tokens refined; ThemeProvider + toggle in header
- Animation tokens: `fade-up`, `glow-pulse`, `float`, `shimmer`

**3D Africa Logo (react-three-fiber@^8.18, three, @react-three/drei@^9.122)**
- New `src/components/AfricaLogo3D.tsx`: extruded Africa silhouette, ~12 glowing emerald nodes at major cities, animated connecting lines, slow auto-rotate, hover-tilt
- Lite SVG fallback for low-data mode and mobile <768px

**Hero redesign (`Hero.tsx`)**
- Split layout: copy left, 3D logo right (stacks on mobile)
- Glass stat cards, gradient headline, subtle particle bg
- New CTAs: "Find Talent" / "Find Work"

**Header**: theme toggle, refined nav, logo lockup

## Wave 2 — Trust & content pages

- Rebuild `/about` with founder story (Eazi), mission, team, employer logo wall
- `/privacy`, `/terms` pages (legal templates customized for SLA)
- Testimonials section + Success Stories section on `/`
- Verified employer logo strip (placeholder logos)
- Routes added to `App.tsx`, footer links

## Wave 3 — AI features

- Edge function `ai-cv-builder`: takes profile JSON → returns formatted CV (Lovable AI Gateway, Gemini)
- Page `/cv-builder`: form + live preview + PDF export
- Edge function `ai-talent-match`: employer posts criteria → ranked talent list
- Skill recommendations widget on profile (uses existing skill-gap function, new UI)

## Wave 4 — Job features

DB migration:
- `saved_jobs` table (user_id, job_id, RLS)
- `job_alerts` table (criteria, frequency)
- `jobs.is_remote`, `jobs.visa_sponsorship`, `jobs.experience_level` columns
- `applications.tracking_status` enum extension (applied → reviewed → interview → offer → hired/rejected)

UI:
- One-click apply button (uses saved profile)
- `/saved` page, `/alerts` page, `/applications` tracker
- JobBoard filters: Remote / Visa Sponsorship / Experience
- Application kanban for talents

## Tech notes

- WhatsApp via Twilio: deferred — will scaffold notification preferences UI but no sending until Twilio connector is added
- Mobile money: existing manual flow untouched
- Low-data mode: a `useDataSaverMode` hook + body class that disables 3D, heavy images, animations
- All colors stay semantic tokens — no hex in components
- React 18 versions pinned for r3f

## What I'll execute now (Wave 1 only)

1. Install `three`, `@react-three/fiber@^8.18`, `@react-three/drei@^9.122.0`
2. Update `index.css` + `tailwind.config.ts` with new tokens
3. Create `AfricaLogo3D.tsx` + `AfricaLogoLite.tsx` + `useDataSaverMode.ts`
4. Create `ThemeProvider` + theme toggle
5. Rewrite `Hero.tsx`, refresh `Header.tsx`
6. Update memory with new design tokens

After you confirm Wave 1 looks right, I'll proceed to Wave 2.
