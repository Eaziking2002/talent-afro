# Mega Wave: Recruitment Finish + AI + Auth + Polish

Scope is intentionally large (slider=5). Sequencing keeps the app working between sub-waves.

## A. Finish Recruitment Overhaul (Wave 3 + 4)

**Email + notifications**
- New edge fn `send-application-email` (Resend, gateway pattern) — sends:
  - submission confirm to talent
  - new applicant alert to employer
  - status-change updates to talent
- Hook into existing `handle_new_application` and `handle_application_status_change` triggers via a small `pg_net`-style call replaced with a server-side trigger that inserts into `notifications` (already done) + frontend `useEffect` realtime subscription invokes the email fn for events the user owns. Simpler: call `send-application-email` directly from `ApplicationWorkflow.submit` (talent confirm + employer alert) and from `EmployerApplications` status change handler.

**JobCard redesign + advanced filters**
- Rewrite `src/components/JobCard.tsx`: glass card, company logo, salary range, remote/visa/verified badges, tags pills, posted-time, save + apply buttons, hover lift.
- New `src/components/jobs/JobFilters.tsx`: sheet on mobile / sidebar on desktop. Filters: remote (chip), salary range (Slider), experience level (chips), visa sponsorship (Switch), country (Combobox), job type (chips), verified employers only (Switch), AI-matched only (Switch). Active chips + Clear all.
- Refactor `src/pages/JobBoard.tsx` to use the new filter component and pass query params to existing fetch.

## B. AI Suite Expansion

- **AI CV Builder** (`/ai-cv-builder`): page with form (role, experience, skills, education, achievements). New edge fn `ai-cv-builder` using `google/gemini-2.5-flash` returns a structured CV (markdown). Render preview + "Download as PDF" using `jspdf` (already common) or simple print stylesheet. Save URL to profile.
- **AI Proposal Generator** in `ApplicationWorkflow`: button next to cover letter (already wired to `ai-cover-letter`); rename UI label to "AI Proposal Generator", show streaming.
- **AI Resume Scoring** (`/resume-score`): upload CV → edge fn `ai-resume-score` (Gemini) returns score 0–100 + strengths/weaknesses/suggestions JSON via tool calling.
- **AI Interview Prep**: small widget on `/applications` per application — edge fn `ai-interview-prep` returns 5 likely questions + tips for that job/title.

## C. Auth + Onboarding

- Enable managed Google OAuth (`configure_social_auth providers:["google"]`).
- Add Google sign-in button to `src/pages/Auth.tsx` using `lovable.auth.signInWithOAuth("google", ...)` if `src/integrations/lovable` present; otherwise use supabase OAuth fallback.
- Multi-step role selection on signup: candidate vs employer (already locked) — add role chips on first step before email/password.
- Password HIBP enabled via `configure_auth`.
- LinkedIn OAuth: not natively supported — add a non-functional "Connect LinkedIn" affordance in profile that links externally for now (note in copy).

## D. Dashboard polish + Africa-first + Trust

- **Profile completion score** widget on `TalentDashboard` (rule-based: name, bio, skills>=3, location, cv_url, portfolio_links>=1, video_intro_url, id_verified → %).
- **Saved jobs** count card linking to existing bookmark page.
- **Recruiter analytics** card on `EmployerDashboard` (applications/job, avg time-to-respond from `application_status_history`).
- **WhatsApp share** util on `JobCard` (`https://wa.me/?text=`).
- **Low-data toggle** in `ThemeToggle` cluster — already have `useDataSaverMode` hook; add visible switch in header dropdown.
- **i18n scaffold**: install `i18next` + `react-i18next`, wrap `App.tsx` with provider, EN/FR resources for Header + Hero + Footer.
- **Privacy Policy** (`/privacy`) and **Terms** (`/terms`) static pages with proper SEO. Link from Footer.

## Technical notes

- All AI edge fns use Lovable AI Gateway; handle 429/402 with friendly toasts.
- All edge fns: CORS, JSON validation with zod, no secrets exposure.
- New routes added to `App.tsx`: `/ai-cv-builder`, `/resume-score`, `/privacy`, `/terms`.
- No DB schema changes needed (existing tables already cover all features).
- All UI uses existing semantic tokens (`primary`, `secondary`, `glass`).

## Files (high-level)

**New:**
- `supabase/functions/send-application-email/index.ts`
- `supabase/functions/ai-cv-builder/index.ts`
- `supabase/functions/ai-resume-score/index.ts`
- `supabase/functions/ai-interview-prep/index.ts`
- `src/components/jobs/JobFilters.tsx`
- `src/pages/AICVBuilder.tsx`
- `src/pages/ResumeScore.tsx`
- `src/pages/Privacy.tsx`
- `src/pages/Terms.tsx`
- `src/lib/i18n.ts`, `src/locales/en.json`, `src/locales/fr.json`

**Edited:**
- `src/components/JobCard.tsx` (full redesign)
- `src/pages/JobBoard.tsx` (use new filters)
- `src/components/application/ApplicationWorkflow.tsx` (email confirm + AI label)
- `src/pages/EmployerApplications.tsx` (status email trigger)
- `src/pages/Auth.tsx` (Google button + role selection chips)
- `src/pages/TalentDashboard.tsx`, `src/pages/EmployerDashboard.tsx` (new widgets)
- `src/components/Header.tsx` (data-saver toggle)
- `src/components/Footer.tsx` (privacy/terms links)
- `src/App.tsx` (new routes + i18n provider)

Reply **"go"** to ship this entire wave.