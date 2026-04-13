# Feature Landscape

**Domain:** Windshield repair / auto glass service website (local single-location shop)
**Project:** Alamo City Windshield Repair — San Antonio, Texas
**Researched:** 2026-04-12

---

## Table Stakes

Features customers expect when landing on a local auto glass website. Missing any of these causes immediate bounce or lost trust.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Prominent phone number on every page | Urgent-need customers (broken windshield, can't drive) will call first. Not finding a number immediately = they leave. | Low | Fixed in nav/header. Sticky on mobile. |
| Online estimate / instant quote | Customers comparison-shop. If they can't get a price without calling, they move on to a competitor that gives one. | Medium | VIN-based formula already planned. Differentiator if instant; table stakes if generic. |
| Service description pages | Customers want to confirm the shop does their specific need (chip repair vs full replacement vs ADAS calibration). | Low | Separate content sections or pages per service type. |
| Contact form | Expected fallback for non-urgent inquiries, after-hours reach-out, or customers who won't call. | Low | Already planned. Capture name, phone, optional address. |
| Mobile-responsive layout | 60–70% of local service searches happen on phones. A broken mobile layout signals an unprofessional business. | Medium | Already constrained to responsive design. |
| Business hours and location | Customers need to know: are you open now? Where are you? Is this a mobile service or shop visit? | Low | Footer or contact page. Include "mobile service available" signal. |
| Appointment booking | Customers expect to book without a phone call. Competitors like Safelite offer 24/7 online scheduling. | Medium-High | Visual calendar already planned. |
| Trust signals: reviews / testimonials | Auto glass is a safety-critical purchase. Customers look for social proof before committing. | Low | Static testimonials or embedded Google review widget. |
| Warranty statement | Every major competitor (Safelite, Auto Glass Now, Speedy Glass, local competitors) advertises lifetime warranty on installation. Not stating one raises doubt. | Low | Display on landing page and service pages. |
| Clear CTA above the fold | The homepage must answer "Can you help me today?" within 3 seconds. A visible estimate or booking button is non-negotiable. | Low | Hero section with primary CTA to VIN estimate flow. |
| About / credibility page | Small local shops win on trust. Customers choosing a local shop over Safelite want to know who they're dealing with. | Low | Already planned. Mission/vision content. |

---

## Differentiators

Features that set this site apart from the average local competitor. Not universally expected, but high value when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| VIN-based instant estimate | No competitor in the San Antonio local market (Glass Dawg, Limitless Auto Glass, Rock Guard) offers this. Safelite does it, but local shops almost never do. Removes the #1 friction: "How much will this cost for my car?" | High | Core planned feature. Requires NHTSA vPIC API + formula engine. |
| Visual availability calendar | Most local shop sites use a generic "request a callback" form. An actual bookable calendar with visible time slots creates immediate confidence and commitment. | High | Already planned. Key UX advantage over competitors. |
| Formula-based pricing transparency | Showing how the price is calculated (base + vehicle size + windshield type + ADAS modifier) builds trust vs. "call for price." Customers dislike opacity. | Medium | Backend formula logic + frontend display of breakdown. |
| ADAS calibration callout | Modern vehicles (2018+) require sensor recalibration after windshield replacement. Few local shops prominently communicate this. Mentioning it signals expertise and prevents post-service surprises. | Low | Content-only. No tooling needed — just clear service copy. |
| Admin analytics dashboard | Not customer-facing, but business-differentiating: lets the owner see which channels drive contacts and VIN lookups, informing marketing spend. | High | Already planned. Supabase + charts. |
| Snap-scroll full-page UX | Unusual for local service sites, which tend to look dated. Signals modern, trustworthy brand. | Medium | Already planned. CSS scroll-snap. |
| Service area clarity ("We serve San Antonio") | Hyper-local messaging (neighborhoods served, ZIP codes, familiar landmarks) outperforms generic copy for local SEO and trust. | Low | Content decision — mention specific SA areas/neighborhoods in copy. |

---

## Anti-Features

Features that appear valuable but should be deliberately excluded for this project.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Online payment / card processing | Adds PCI compliance scope, Stripe integration complexity, and changes the service model (payment currently happens in person). Project explicitly out of scope. | Estimate + book online, pay in person. State this clearly so customers have no confusion. |
| Customer account / login portal | Customer account management (saved vehicles, appointment history, past quotes) is Safelite-tier complexity. For a single-location local shop, the overhead is not worth it. Session-less booking is sufficient. | Use email confirmation for booking reference. No auth needed on customer side. |
| SMS / text notifications | Adds Twilio/SMS provider integration, opt-in compliance (TCPA), and operational cost. Project explicitly out of scope. | Capture phone number in booking; technician calls or texts manually. |
| Insurance claim filing / coordination | Direct insurance billing is an operational process, not a web feature. Attempting to build an insurance portal is months of compliance and API work. | Add a simple "We work with all major insurers" copy block. Customer handles their own claim. |
| Live chat / AI chatbot | Chatbots for auto glass shops are available (Dialogflow CX-based), but require ongoing maintenance, training data, and produce poor experiences when undertrained. Overkill for v1. | Prominent phone number + contact form covers the same need reliably. |
| Multi-location support | Out of scope for v1 (single San Antonio location). Building for it prematurely adds routing complexity, location selectors, and per-location inventory/scheduling logic. | Single-location architecture. Document the extension point for future locations if needed. |
| Inventory / parts catalog | Auto glass shops don't sell parts direct-to-consumer. An inventory display adds no customer value and confuses the service-first offering. | Pure service pages — no part numbers or inventory lists. |
| Before/after photo gallery | Nice to have, but maintaining a photo library requires operational discipline (photographing every job). If not kept current, a stale gallery undermines trust. | One or two high-quality hero photos in the About page. Avoid a dedicated gallery page. |
| Blog / SEO content hub | Long-term SEO play requiring ongoing content investment. High value over 12+ months but wrong priority for v1. | Use meta descriptions, page titles, and structured data for baseline local SEO instead. |

---

## Feature Dependencies

These are build-order constraints — where one feature must exist before another can be built.

```
VIN API integration
  └─ Estimate formula engine     (formula needs vehicle data from VIN)
       └─ Estimate display UI    (UI consumes formula output)
            └─ Contact form VIN  (contact form uses same VIN lookup for pre-fill)

Supabase schema (appointments table)
  └─ Appointment booking backend (API routes for creating/reading slots)
       └─ Visual calendar UI     (calendar reads available slots, posts booking)

Supabase Auth (admin login)
  └─ Admin dashboard             (protected route; requires auth)
       └─ Analytics charts       (dashboard sub-feature; requires auth + data)
       └─ User management        (dashboard sub-feature; requires auth)

Analytics event tracking
  └─ Admin dashboard charts      (charts consume tracked events)
```

---

## MVP Feature Prioritization

### Must ship (launch blockers)

1. **Landing page with hero + snap scroll** — First impression; without it the site isn't "done"
2. **VIN estimate flow** — Core value proposition; the reason this site exists
3. **Appointment booking calendar** — Core conversion action
4. **Contact form** — Table stakes fallback; captures leads when booking feels like too much
5. **About page** — Trust signal for local customers
6. **Mobile responsiveness** — Non-negotiable; 60%+ of traffic is mobile

### High value, non-blocking

7. **Admin dashboard with analytics** — Needed by owner post-launch to evaluate performance
8. **Admin user management** — Operational; needed before handing off admin access

### Defer to v2 (post-validation)

- Service area / ZIP-based messaging widget ("We're available in your area today")
- Embedded Google review widget (requires Maps API key + widget integration)
- Blog / SEO content pages
- SMS notification on booking confirmation

---

## Competitive Context: San Antonio Market

The local San Antonio competitors (Glass Dawg, Limitless Auto Glass, Rock Guard Auto Glass, Patsco Windshield, Auto Glass in San Antonio) share a common pattern:

- Phone number + "Get a Free Quote" form
- Claim to work with insurance
- Mention lifetime warranty
- No real-time pricing
- No visual calendar — "request an appointment" form at best

The VIN-based instant estimate + visual calendar booking combination does not appear in any identified local competitor's website. This combination is the primary competitive differentiation for this project.

---

## Confidence Assessment

| Area | Confidence | Basis |
|------|------------|-------|
| Table stakes features | HIGH | Consistent across Safelite, Auto Glass Now, Glass Doctor, Speedy Glass, and local San Antonio competitors |
| VIN estimate as differentiator | HIGH | No local SA competitor found offering this; Safelite does it at national scale |
| Visual calendar as differentiator | MEDIUM | Common in national chains; rare in local SA market based on search results |
| Anti-features (what not to build) | HIGH | Aligns with project constraints and confirmed by complexity/value analysis |
| ADAS callout as differentiator | MEDIUM | Growing industry requirement; local shops inconsistent in surfacing it |

---

## Sources

- Safelite.com VIN and scheduling features: https://www.safelite.com/schedule-service and https://www.safelite.com/windshield-auto-glass-technology/vin
- Servgrow auto glass website features analysis: https://www.servgrow.com/pro-websites/auto-glass
- Elmo Anywhere auto glass industry trends 2025: https://elmoanywhere.com/auto-glass-industry-trends/
- Auto Glass industry trends and ADAS: https://www.revvhq.com/blog/offer-adas-calibration-at-auto-glass-shop
- San Antonio local competitors: https://glassdawg.net, https://www.limitlessautoglasstx.com, https://www.rockguardautoglass.com
- Local SEO and trust signals for auto glass 2025: https://fourwheel.digital/maximize-visibility-with-local-seo-strategies-for-auto-glass/
- Auto Glass Now scheduling UX: https://elevate-digital.com/portfolio-item/auto-glass-now-redesign-and-quote/
- Booking UX best practices 2025: https://ralabs.org/blog/booking-ux-best-practices/
- Warranty trust signals: https://www.safelite.com/national-lifetime-warranty and https://www.autoglassnow.com/warranty/
- NHTSA vPIC API: https://vpic.nhtsa.dot.gov/api/
