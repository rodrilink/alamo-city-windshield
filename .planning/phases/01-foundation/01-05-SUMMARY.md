---
plan: 01-05
phase: 01-foundation
status: complete-with-deferred-checkpoint
commits:
  - "(git history across all plans — no new commits required)"
key_files:
  created: []
  modified: []
---

# Plan 01-05: Git + GitHub + Vercel Deployment — Summary

## What Was Built

**Task 1 — Git repo state verified:**
- `.gitignore` is complete: `.env.local`, `.env*.local`, `.env`, `.vercel/`, `supabase/.temp/`, `supabase/.branches/`, `node_modules/`, `.next/`, `out/` all present.
- Git repository is initialized (was initialized during `/gsd-new-project`).
- Multiple atomic commits exist from plans 01-01 through 01-04 (git log shows complete history).
- **No secrets committed** — `git ls-files | grep -E "\.env\.local$|\.env$"` returns empty.
- `.env.example` IS committed (safe — documents required vars with no real values, explicit warning that `SUPABASE_SERVICE_ROLE_KEY` must never have `NEXT_PUBLIC_` prefix).

**Task 2 — Vercel deployment: checkpoint-deferred.**

## Pending Human Action: Supabase + GitHub + Vercel Setup

This is a blocking external-service checkpoint. The owner must complete these before Phase 1 reaches full "live deployment" verification:

### 1. Create Supabase Project
1. Go to https://supabase.com/dashboard
2. Create a new project (region: `us-south-1` recommended for San Antonio proximity)
3. Copy credentials from **Settings → API**:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY` (server-only — never in `NEXT_PUBLIC_`)
4. Create `.env.local` in the project root with these values (file is in `.gitignore`).
5. Link Supabase CLI and push migration:
   ```bash
   npx supabase link --project-ref <project-id>
   npx supabase db push
   ```
6. Verify in Supabase dashboard that 4 tables exist with RLS enabled: `bookings`, `contacts`, `analytics_events`, `vin_cache`.

### 2. Create GitHub Repository
1. Go to https://github.com and create a new repository (suggest: `alamo-windshield`).
2. In the project root, run:
   ```bash
   git remote add origin https://github.com/<username>/alamo-windshield.git
   git branch -M main
   git push -u origin main
   ```
   Or if GitHub CLI is installed:
   ```bash
   gh repo create alamo-windshield --public --source=. --remote=origin --push
   ```

### 3. Connect Vercel
1. Go to https://vercel.com/new
2. Import the GitHub repository.
3. Framework auto-detects as Next.js.
4. **Configure environment variables BEFORE first deploy:**
   - `NEXT_PUBLIC_SUPABASE_URL` → Production + Preview
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Production + Preview
   - `SUPABASE_SERVICE_ROLE_KEY` → **Production ONLY** (T-01-15 mitigation; reduces exposure from preview URLs)
   - `NEXT_PUBLIC_SITE_URL` → leave blank for first deploy; set to the `.vercel.app` URL after and redeploy.
5. Click Deploy.

### 4. Verify Live Deployment
1. Visit the Vercel URL (e.g., `alamo-windshield.vercel.app`).
2. Confirm on desktop:
   - Home page renders with sticky TopNav (Home, About, Contact, Admin links) and phone `(210) 555-0100` visible.
   - Footer shows business hours (Mon–Fri 8–6, Sat 9–2) and "San Antonio, TX".
   - Brand red (`#B91C1C`) applied to primary elements.
3. Confirm all 4 routes return HTTP 200: `/`, `/about`, `/contact`, `/admin/login`.
4. Confirm `/admin/login` does NOT show the public TopNav/Footer (different route group layout).
5. Resize to mobile width — confirm hamburger menu opens the Sheet drawer with nav links.
6. Confirm Vercel build logs have zero errors.

## Key Decisions Honored

- **D-20**: Vercel via GitHub integration (auto-deploys on push).
- **D-21**: `.env.example` committed with correct prefix usage; real secrets never committed.
- **T-01-14**: `.env.local` verified not tracked by git.
- **T-01-15**: Service role key documented as Production-only (not Preview).

## Acceptance Criteria — Task 1

- [x] `.gitignore` contains `.env.local` and `.env*.local`
- [x] `.gitignore` contains `.vercel/`
- [x] `.gitignore` contains `supabase/.temp/`
- [x] `.gitignore` contains `node_modules/`
- [x] `.gitignore` contains `.next/`
- [x] Git repository is initialized with multiple commits
- [x] `.env.local` is NOT tracked by git
- [x] No file containing real Supabase keys is committed

## Acceptance Criteria — Task 2 (pending human action)

- [ ] Vercel build completes with zero errors
- [ ] Live URL returns HTTP 200 on all four public routes
- [ ] TopNav and Footer visible on public pages
- [ ] Brand red (`#B91C1C`) applied to primary elements
- [ ] Mobile hamburger menu functional
- [ ] Environment variables configured in Vercel dashboard

## Overall Status

Task 1 deliverables complete. Task 2 is blocked on owner creating and configuring three external services (Supabase, GitHub, Vercel). All code artifacts ready for deployment — the local `npm run build` passes cleanly with all 4 routes generating static pages.

Phase 1 is **code-complete and deployment-ready**. Final live-URL verification awaits the external-services checkpoint above.
