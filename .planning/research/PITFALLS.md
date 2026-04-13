# Domain Pitfalls

**Domain:** Windshield repair/installation service web app
**Stack:** Next.js + React + TailwindCSS + shadcn/ui + Supabase + Vercel
**Researched:** 2026-04-12
**Confidence:** HIGH (most verified via official docs or multiple corroborating sources)

---

## Critical Pitfalls

Mistakes that cause security breaches, data loss, or full rewrites.

---

### Pitfall 1: Supabase Tables Created Without Row Level Security

**What goes wrong:** Supabase creates all tables with RLS disabled by default. Any table without RLS is fully readable and writable by anyone who has the project URL and anon key — both of which are intentionally embedded in the frontend. In January 2025, 170+ production apps built on Supabase were found to have exposed databases for this exact reason.

**Why it happens:** Developers enable RLS only after noticing the security gap. The Supabase dashboard doesn't block you from building without it. The anon key is designed to be public, so the false sense of security is that the key alone protects access.

**Consequences:** Anyone with the browser devtools can read your entire `appointments`, `contacts`, and `users` tables. For a business collecting customer phone numbers and VINs, this is a GDPR/privacy liability.

**Prevention:**
- Enable RLS on every table at creation time, before any data enters
- The rule of thumb: if a table is created, RLS is enabled on the same migration
- Write explicit policies. Enabling RLS with zero policies means "deny all" — you must also write the allow policies
- The `contacts` and `appointments` tables need write-only anon access (INSERT allowed, no SELECT for anon)
- The `analytics` / `admin` tables need SELECT restricted to the `authenticated` role only

**Warning signs:**
- You can `SELECT * FROM contacts` in the Supabase SQL editor without being authenticated
- The Supabase dashboard shows tables with the RLS "disabled" badge

**Phase:** Address in the very first database migration. Never defer.

---

### Pitfall 2: Supabase service_role Key Leaking into Client Code

**What goes wrong:** The `service_role` key bypasses RLS entirely. If it ends up in a Next.js component, a `NEXT_PUBLIC_` prefixed variable, or any client bundle, any visitor to the site can exfiltrate or destroy all data.

**Why it happens:** Developers copy both keys from the Supabase dashboard during setup and reach for whichever one "works." The service_role key often gets used to fix an RLS-related permission error rather than fixing the policy.

**Consequences:** Complete database compromise. No RLS policy stops a request made with the service_role key.

**Prevention:**
- `SUPABASE_SERVICE_ROLE_KEY` must never have the `NEXT_PUBLIC_` prefix
- Use the service_role key only in Next.js Server Actions or Route Handlers, never in components
- In local dev, double-check `.env.local` — if it's prefixed `NEXT_PUBLIC_`, rename it immediately
- Use the `anon` key for all client-side Supabase initialization

**Warning signs:**
- `NEXT_PUBLIC_SUPABASE_SERVICE_KEY` exists in any `.env` file
- The service_role key appears in your browser's network requests

**Phase:** Enforce at project setup. Add a lint rule or `.env` check to the CI step.

---

### Pitfall 3: Admin Routes Protected Only on the Client

**What goes wrong:** Admin dashboard pages check `supabase.auth.getSession()` in a client component and redirect if no session. This causes a flash of admin content before the redirect fires, and it can be bypassed because `getSession()` trusts the local cookie without revalidating with Supabase's server.

**Why it happens:** Client-side auth guards are simpler to implement and feel correct. The flaw — that `getSession()` doesn't make a network call to verify the token — is not obvious.

**Consequences:** Flash of unauthenticated content exposes admin UI. Worse: forged or expired tokens can pass the check.

**Prevention:**
- Protect `/admin/*` routes in Next.js middleware using `supabase.auth.getUser()`, which always revalidates with Supabase's auth server
- Never use `getSession()` in middleware or Server Components for auth gating
- The middleware must handle the auth cookie refresh (Supabase SSR package does this, but only if the middleware is correctly configured)
- Add the middleware `matcher` to exclude static assets (`/_next/`, `/favicon.ico`) — if middleware runs on every asset request it adds latency and can cause errors

**Warning signs:**
- Admin page briefly renders before redirecting when logged out
- Using `getSession()` anywhere in middleware or Server Components

**Phase:** Implement before any admin dashboard work. The auth foundation must be correct before building on top of it.

---

### Pitfall 4: Middleware Auth Infinite Redirect Loop

**What goes wrong:** A Next.js middleware that redirects unauthenticated users to `/admin/login` will loop infinitely if the login page itself is also protected by the same middleware rule — or if the Supabase auth session refresh throws an error that the middleware doesn't handle, redirecting the user to login, which triggers the middleware again.

**Why it happens:** The middleware catch-all path isn't excluded properly. Auth errors aren't handled — they silently cause the condition to evaluate as "unauthenticated."

**Consequences:** Admin users are completely locked out. The browser shows "too many redirects."

**Prevention:**
- The middleware `matcher` must explicitly exclude `/admin/login` from the protected routes
- Wrap the Supabase session refresh in try/catch; on error, allow the request to pass rather than redirect
- Test the auth flow with an expired token, a corrupted cookie, and a fresh incognito window

**Warning signs:**
- ERR_TOO_MANY_REDIRECTS in browser on `/admin/login`
- Middleware running on the login page itself

**Phase:** Auth middleware implementation and integration testing phase.

---

## High Severity Pitfalls

Mistakes that cause significant UX failures or wasted development cycles.

---

### Pitfall 5: NHTSA vPIC API Is Slow and Has No SLA Guarantee

**What goes wrong:** The NHTSA vPIC API has real-world average response times of 2.5–3.5 seconds, with occasional requests reaching 5+ seconds. If the VIN lookup in the estimate form makes a direct client-to-NHTSA call and blocks the UI, the estimate experience feels broken.

**Why it happens:** The API is free and run by a government agency. It's reliable (99% uptime during business hours) but not fast. Developers test locally on fast connections and don't encounter the worst-case latency.

**Additional limitation:** Pre-1995 vehicles have only 60–65% decode confidence. The API may return empty or partial results for uncommon manufacturers, trucks with non-standard VINs, or vehicles not intended for U.S. sale.

**Consequences:** Users experience a multi-second spinner on the estimate form. If the API is briefly down or slow, the entire estimate feature appears broken.

**Prevention:**
- Route all NHTSA calls through a Next.js Route Handler (server-side proxy), not directly from the browser
- Add a 6-second timeout on the fetch. If it times out, show a fallback: "We couldn't decode your VIN automatically — enter your year, make, and model manually"
- Validate the VIN format client-side (17-character alphanumeric, no I/O/Q) before making the API call at all
- Cache decoded VINs in Supabase for repeat lookups — if the same VIN is searched again, return the cached result immediately
- Display a skeleton/loading state the moment the user submits the VIN, not after the response arrives

**Warning signs:**
- The estimate form hangs for 3+ seconds with no feedback
- API returning `null` for make/model fields on older vehicles

**Phase:** VIN decode feature implementation. The proxy and timeout must be in place before the feature ships.

---

### Pitfall 6: Double-Booking Race Condition in Appointment Slots

**What goes wrong:** Two users open the calendar at the same time, both see the 10:00 AM slot as available, and both submit a booking. Without a database-level constraint, both succeed and the business receives two appointments for the same slot.

**Why it happens:** Availability is checked with a SELECT, then the booking is created with a separate INSERT. Between those two operations, another request can also check availability and find the slot open. Standard application-level checks don't prevent this.

**Consequences:** The business owner shows up with two customers at the same time. Lost trust, manual cleanup required.

**Prevention:**
- Add a `UNIQUE` constraint on `(appointment_date, appointment_time)` in the `appointments` table
- The duplicate insert will throw a PostgreSQL unique constraint violation — catch this error in the Server Action and return a user-friendly "Sorry, that slot was just taken — please choose another time"
- Alternatively, use a PostgreSQL advisory lock or `INSERT ... ON CONFLICT DO NOTHING` with a check on the returned row count
- Do not rely on JavaScript-level checks to prevent double booking

**Warning signs:**
- Two `appointments` rows with the same `(date, time)` exist in the database
- No unique constraint on the `appointments` table

**Phase:** Database schema design (must be in the initial migration). The constraint costs nothing to add early and is very expensive to retrofit.

---

### Pitfall 7: Timezone Confusion in Date Storage and Calendar Display

**What goes wrong:** The shadcn/ui Calendar component returns JavaScript `Date` objects. Saving these directly to Supabase (which stores them as UTC timestamps) causes off-by-one-day errors. A user in San Antonio (UTC-5/UTC-6) who books "Thursday at 9 AM" may see "Wednesday at 3 PM" in the database, breaking admin calendar views and any future email confirmations.

**Why it happens:** JavaScript `Date` objects are local-time-aware but serialize to UTC. Supabase stores UTC. The mismatch appears as a date one day earlier when storing an end-of-day local time as UTC.

**Consequences:** Admin dashboard shows wrong dates. If notifications are added later, they fire at wrong times. Customers show up at the wrong time.

**Prevention:**
- Store appointment times as `DATE` + `TIME` columns (not a single `TIMESTAMPTZ`) — this avoids timezone math entirely for a business with a fixed local timezone
- Alternatively, store as `TIMESTAMPTZ` but always convert to `America/Chicago` (San Antonio's timezone) before display
- When reading dates back from Supabase, always apply explicit timezone formatting before displaying to users
- Test by setting the browser timezone to UTC, Eastern, and Pacific during development

**Warning signs:**
- Appointments stored in database appear one day off from what the user selected
- `new Date(isoString).toLocaleDateString()` produces different results on different machines

**Phase:** Appointment booking implementation. Lock down the date storage strategy before building the calendar UI.

---

### Pitfall 8: NEXT_PUBLIC_ Environment Variable Confusion Leaks Secrets or Breaks Production

**What goes wrong:** Variables without `NEXT_PUBLIC_` prefix are server-only and return `undefined` in client components. Variables with `NEXT_PUBLIC_` are bundled into the client and visible to anyone. The wrong prefix in the wrong place causes either a silent undefined (breaking the feature) or a leaked secret.

**Specific to this project:**
- `SUPABASE_SERVICE_ROLE_KEY` — must NOT have `NEXT_PUBLIC_`
- `NEXT_PUBLIC_SUPABASE_URL` — must have `NEXT_PUBLIC_`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — must have `NEXT_PUBLIC_`

**Additional trap:** `NEXT_PUBLIC_` variables are evaluated at **build time**. Changing them in the Vercel dashboard requires a new deployment — it does not take effect on already-deployed builds. Developers sometimes update the variable and expect the running app to pick it up without redeploying.

**Prevention:**
- Document every environment variable with its correct name and scope in a `.env.example` file
- Configure all variables in the Vercel dashboard before the first deployment
- When changing a `NEXT_PUBLIC_` variable, always trigger a new deployment

**Warning signs:**
- `process.env.SUPABASE_URL` is `undefined` in a client component
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` exists in any file

**Phase:** Project setup. Resolve before any Supabase integration work begins.

---

### Pitfall 9: Contact Form Submits Without Bot Protection

**What goes wrong:** An open contact form on a business website with no bot protection will receive spam within days of launch. Without rate limiting or bot detection, automated tools will flood the `contacts` table with junk data, polluting analytics and potentially causing costs if any downstream integrations are added.

**Why it happens:** Bot protection is treated as a "later" concern. The form works, so it ships.

**Consequences:** Spam contacts corrupt the "contacts over time" admin chart. Manual cleanup required. Rate costs if a notification service is added later.

**Prevention:**
- At minimum, implement a honeypot field (hidden input that real users leave blank, bots fill in — reject submissions where it has a value)
- Add server-side rate limiting on the contact form Server Action — no more than 5 submissions per IP per hour
- For the VIN search, rate-limit to prevent scraping: the NHTSA API has automated traffic rate control that can block your server's IP if you make too many requests

**Warning signs:**
- `contacts` table has rows with nonsense names or phone numbers
- VIN search logs show the same IP making dozens of requests per minute

**Phase:** Contact form implementation. Honeypot is trivial to add during the same PR. Rate limiting should be addressed before launch.

---

## Moderate Pitfalls

---

### Pitfall 10: Full-Page Snap Scroll Breaks on Mobile Safari

**What goes wrong:** CSS scroll-snap with `scroll-snap-type: y mandatory` on the `<html>` or a full-height container does not behave consistently on iOS Safari. The browser may fail to snap, snap to the wrong position, or fight with the dynamic viewport height (the Safari toolbar shrinks/expands on scroll, changing the viewport height mid-snap).

**Prevention:**
- Use `height: 100dvh` (dynamic viewport height) rather than `100vh` on snap sections — `100vh` is calculated on page load and doesn't account for the Safari toolbar
- Test on a real iOS Safari device, not just Chrome DevTools mobile emulation
- Keep `scroll-snap-type: y mandatory` on a dedicated scroll container div rather than on `<html>` or `<body>` — this is more cross-browser reliable
- Provide a fallback for users where snap does not activate (the content is still readable, just without snapping)

**Warning signs:**
- Sections don't snap on iPhone
- Content appears cut off at the bottom on iOS

**Phase:** Landing page implementation.

---

### Pitfall 11: NHTSA VIN Response Fields Are Inconsistent and Require Explicit Mapping

**What goes wrong:** The vPIC API returns a large array of `{ Variable, Value }` pairs — often 100+ fields per decode. The fields you need (Model Year, Make, Model, Body Class, Plant country) are present by name but not by fixed index. Some vehicles return partial data: `Model` is present but `Body Class` is null. Pricing formula logic that reads `.bodyClass` directly will throw or produce `undefined` silently.

**Prevention:**
- Build a dedicated mapping function that extracts only the needed fields from the vPIC response by variable name
- Treat every field as potentially null — the pricing formula must have explicit defaults for each modifier when a field is missing
- Log which fields were missing per VIN decode during development to discover common gaps early
- Consider mapping `Body Class` to a simplified internal enum (`sedan`, `suv`, `truck`, `van`) rather than passing raw vPIC strings into the formula

**Warning signs:**
- Estimate displays `$NaN` or `$undefined`
- The formula returns the same result regardless of vehicle type

**Phase:** VIN decode + pricing formula implementation. The mapping layer should be a well-tested utility function.

---

### Pitfall 12: Formula-Based Pricing Has No Admin Control

**What goes wrong:** The pricing formula is hardcoded in the application. When the business owner wants to adjust the ADAS calibration surcharge or base price (a near-certain business need), a developer must change code, commit, and redeploy.

**Prevention:**
- Store pricing modifiers in a Supabase table (`pricing_config`) with rows like `{ key: 'adas_calibration', value: 350, label: 'ADAS Calibration Surcharge' }`
- The admin dashboard phase should include a simple pricing config editor
- This also makes the pricing formula auditable — you can see when prices changed

**Warning signs:**
- Base price and all modifiers are constants defined in a TypeScript file

**Phase:** Pricing formula implementation. Design the data structure to support admin-editable values from the start, even if the editor UI is built in a later phase.

---

### Pitfall 13: Vercel Hobby Plan Function Timeout Hits the NHTSA Proxy

**What goes wrong:** On Vercel's Hobby plan, serverless functions have a 10-second execution timeout. The NHTSA API can take 5+ seconds to respond. If two Supabase operations are also chained (cache lookup, then cache write), the total server-side time can approach or exceed 10 seconds.

**Prevention:**
- Set an explicit 6-second timeout on the NHTSA fetch so it fails fast rather than timing out the whole function
- The cache lookup pattern (check Supabase for cached VIN first, call NHTSA only on cache miss) reduces the common-case execution time significantly
- If the project is on Hobby tier, document this timeout limit. Consider upgrading to Pro ($20/month) if the timeout becomes a problem

**Warning signs:**
- Vercel function logs show 504 gateway timeout on the VIN endpoint
- The estimate form spinner runs for 10 seconds then returns an error

**Phase:** VIN proxy implementation and deployment configuration.

---

## Minor Pitfalls

---

### Pitfall 14: shadcn/ui Components Need Manual Theming for White/Red/Black Palette

**What goes wrong:** shadcn/ui ships with a neutral gray default theme. Without explicitly updating the CSS custom properties to match the white/red/black brand palette, the admin dashboard and booking form will look noticeably mismatched from the landing page.

**Prevention:**
- Configure the shadcn/ui theme variables (`--primary`, `--destructive`, `--background`, etc.) in `globals.css` as the first step of UI work
- Map the brand's red to `--primary` so buttons, focus rings, and interactive elements automatically use the correct color

**Phase:** Project setup / first UI implementation.

---

### Pitfall 15: Admin Analytics Built on Table Row Counts Instead of Events

**What goes wrong:** Counting page visitors by counting `contacts` or `vin_searches` rows gives incomplete data — it only counts users who completed an action, not all visitors. The admin dashboard requirement includes tracking page visitors separately from contacts and VIN searches.

**Prevention:**
- Decide on the analytics approach upfront: either use Vercel Analytics (built-in, zero code) for page views, or insert an `analytics_events` row on each meaningful user action via a Server Action
- Do not try to derive visitor count from form submission count — they are different metrics
- Vercel Analytics free tier covers basic page views and is the simplest integration for visitor count

**Warning signs:**
- Visitor count in the dashboard is exactly equal to contact form submissions

**Phase:** Admin dashboard design and analytics implementation.

---

## Phase-Specific Warning Map

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Project setup / env config | NEXT_PUBLIC_ prefix confusion, service_role key exposure | Set `.env.example` with correct prefixes before writing any code |
| Database schema design | Missing RLS, no UNIQUE constraint on appointments | Enable RLS and add constraints in the first migration |
| Auth / admin middleware | Infinite redirect loop, getSession() trust issue | Use getUser() in middleware, exclude login page from matcher |
| VIN decode feature | Slow API, missing fields, no fallback | Proxy through Route Handler, 6s timeout, null-safe field mapping |
| Pricing formula | Hardcoded modifiers, NaN on missing fields | Store modifiers in DB, explicit defaults in formula |
| Appointment calendar | Double booking, timezone off-by-one | UNIQUE DB constraint, store DATE+TIME columns not TIMESTAMPTZ |
| Contact form | Spam submissions, no rate limiting | Honeypot field + server-side rate limit on submission |
| Landing page | Snap scroll broken on iOS Safari | Use `100dvh`, test on real device |
| Admin dashboard | Visitor metric derived from wrong source | Choose analytics approach (Vercel Analytics vs events table) before building charts |
| Vercel deployment | Function timeouts, stale NEXT_PUBLIC_ vars | 6s NHTSA timeout, redeploy after any NEXT_PUBLIC_ change |

---

## Sources

- Supabase RLS official docs: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase RLS performance guide: https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv
- Supabase Next.js auth troubleshooting: https://supabase.com/docs/guides/troubleshooting/how-do-you-troubleshoot-nextjs---supabase-auth-issues-riMCZV
- Supabase SSR Next.js setup: https://supabase.com/docs/guides/auth/server-side/nextjs
- 170+ apps exposed by missing RLS (2025): https://byteiota.com/supabase-security-flaw-170-apps-exposed-by-missing-rls/
- Supabase security misconfiguration analysis: https://www.stingrai.io/blog/supabase-powerful-but-one-misconfiguration-away-from-disaster
- 10 common Next.js + Supabase mistakes: https://www.iloveblogs.blog/post/nextjs-supabase-common-mistakes
- 6 common Supabase auth mistakes: https://startupik.com/6-common-supabase-auth-mistakes-and-fixes/
- NHTSA vPIC API FAQ: https://vpic.nhtsa.dot.gov/api/Home/Index/FAQ
- NHTSA vPIC API comparison (response times): https://cardog.app/blog/free-vin-decoder-api-comparison
- Next.js environment variables guide: https://nextjs.org/docs/pages/guides/environment-variables
- Next.js env variable pitfalls (Plain English): https://javascript.plainenglish.io/how-to-deploy-a-next-js-app-with-environment-variables-common-mistakes-explained-59e52aadd7e0
- Vercel environment variables docs: https://vercel.com/docs/environment-variables
- Vercel function timeouts: https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out
- PostgreSQL race condition prevention with Supabase: https://github.com/orgs/supabase/discussions/30334
- shadcn/ui calendar timezone issue: https://github.com/shadcn-ui/ui/issues/2536
- CSS scroll snap mobile Safari behavior: https://css-tricks.com/practical-css-scroll-snapping/
- Next.js middleware Supabase auth redirect: https://www.iloveblogs.blog/post/handle-supabase-auth-errors-middleware
- Next.js server action security: https://blog.arcjet.com/next-js-server-action-security/
- Honeypot for form spam: https://www.nikolailehbr.ink/blog/prevent-form-spamming-honeypot/
