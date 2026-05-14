# Job Application System Overhaul

This is a large, multi-area change. I'll ship it in 4 sequential waves so each wave is reviewable and the app stays working between waves.

## Wave 1 — Data foundation (DB migration)

Schema additions on `applications`:
- `cv_url`, `cover_letter`, `portfolio_links` (jsonb), `linkedin_url`, `github_url`
- `salary_expectation_minor_units`, `salary_currency`
- `availability` (immediate / 2_weeks / 1_month / negotiable)
- `country`, `years_experience` (int), `remote_preference` (remote/hybrid/onsite/any)
- `tracking_status` enum extension: `submitted | viewed | shortlisted | interview | rejected | hired` (kept alongside legacy `status` for back-compat; new column `tracking_status`)
- `viewed_at`, `status_updated_at`
- Unique index `(job_id, applicant_id)` to prevent duplicates (already partially enforced via 23505)

Schema additions on `jobs`:
- `visa_sponsorship` (bool), `experience_level` (entry/mid/senior/lead), `salary_currency`, `tags` (jsonb), `company_logo_url`

New table `saved_applications` (drafts): `user_id, job_id, draft_data jsonb, updated_at`

Storage bucket: `application-cvs` (private; RLS: owner + employer of job can read).

RLS:
- Talent inserts/updates own application drafts
- Employer can read applications for their jobs and update `tracking_status` only
- Trigger: when employer first views, set `viewed_at` + `tracking_status='viewed'`
- Trigger: send notification on status change (uses existing notifications table)

## Wave 2 — Application workflow UI (talent side)

Replace `JobApplicationDialog` with a multi-step `ApplicationWorkflow` (Sheet on mobile, Dialog on desktop):

1. **Profile & contact** — country, years exp, availability, remote preference
2. **CV & links** — CV upload (PDF/DOCX, 5MB max, dropzone), LinkedIn, GitHub, portfolio links (dynamic list)
3. **Cover letter & salary** — textarea + AI generator button (calls existing `ai-job-matching` edge fn extended, or new `ai-cover-letter` fn using LOVABLE_API_KEY/Gemini), salary expectation + currency
4. **Review & submit** — summary, duplicate check, spam honeypot + min-time guard

Premium UI: glassmorphism panels, progress stepper, smooth Framer-style transitions (Tailwind animate), mobile-first sheet.

Save draft on each step → `saved_applications` so users can resume.

## Wave 3 — Tracking dashboards & notifications

**Talent** (`/applications`): Kanban + list toggle showing applications grouped by `tracking_status`. Cards show company logo, job title, salary, status badge, last update. Filters & search.

**Employer** (`/employer/applications/:jobId` + dashboard widget): Pipeline view (columns per status), drag-to-update status, candidate detail drawer with CV preview, cover letter, profile, contact reveal. Bulk actions (shortlist/reject).

**Notifications**:
- Realtime via existing notifications table + Supabase Realtime channel
- Email via existing Resend integration: new `send-application-email` edge fn triggered on status change (submission confirm to talent, new applicant to employer, status updates to talent)

## Wave 4 — Job board redesign + filters

Redesign `JobCard`:
- Company logo, salary range with currency, remote badge, visa-sponsor badge, verified-employer badge, tags pills, posted-time
- Quick "Save" + "Apply" with hover/press animations
- Glass card on dark/light

Filter sidebar/sheet (mobile bottom-sheet):
- Remote (remote/hybrid/onsite)
- Salary range (dual slider)
- Experience level (chips)
- Visa sponsorship (toggle)
- Country (combobox)
- Job type (chips: full-time/part-time/contract/freelance)
- Verified employers only (toggle)
- AI-matched only (toggle — uses `job_matches` table for current user)
- Active filter chips at top, "Clear all"

Smooth transitions, sticky filter bar on mobile, results count + sort.

## Technical notes

- Spam: honeypot field + min 3s submit time + rate-limit via existing `check_rate_limit` RPC (`endpoint='application_submit'`, 10/hour/user)
- Duplicate prevention: rely on unique `(job_id, applicant_id)` + pre-submit query
- AI cover letter: new edge fn `ai-cover-letter` using `google/gemini-2.5-flash` via Lovable AI Gateway (no key needed)
- All colors via existing semantic tokens (`primary`, `secondary`, `glass`, etc.)
- React Query for server state, optimistic updates on status changes
- Mobile: bottom sheets, large tap targets, safe-area aware

## Files (high-level)

New: `ApplicationWorkflow.tsx`, `ApplicationStepper.tsx`, `CVUpload.tsx`, `ApplicationCard.tsx`, `ApplicationKanban.tsx`, `JobFilters.tsx`, `pages/MyApplications.tsx`, `pages/EmployerApplications.tsx`, `supabase/functions/ai-cover-letter/index.ts`, `supabase/functions/send-application-email/index.ts`
Edited: `JobCard.tsx`, `JobBoard.tsx`, `EmployerDashboard.tsx`, `TalentDashboard.tsx`, `App.tsx` (routes)

Reply **"go"** to approve and I'll start with Wave 1 (the migration).
