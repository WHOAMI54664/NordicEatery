# Group ordering

The menu entry opens `/{locale}/group-order`. New groups reserve a daily Stockholm
slot (10:40 or 11:00); see the daily-slots section below. An organiser creates an invitation,
chooses host-paid or split payment, a selection deadline and an optional budget
per person. Up to 18 browser sessions can join; each edits only its own dishes.
The organiser can remove a guest before locking, review contact/delivery details,
lock the cart, or cancel before submission. A locked cart can be reopened until
someone starts payment. All four existing site languages are supported.

## Boundaries and state

- The personal localStorage cart is independent and is never cleared by this flow.
- One private `group_orders` aggregate owns membership, quantities, frozen prices,
  payment shares and lifecycle. RLS/grants deny direct anon/authenticated access.
- The invitation UUID permits joining and a limited public preview. Membership
  requires a 256-bit random HttpOnly, SameSite cookie scoped to that group's API.
  Only its SHA-256 hash is stored; private tokens and payment IDs never leave the
  server. An invitation is not an organiser credential. Members see names/dishes;
  only the organiser sees contact details. Sessions are tied to this browser.
- State changes use optimistic version checks. Cart changes also check the
  member's revision. A stale lock must be explicitly retried against a new review.
- Prices and combined stock are checked on the server. A selection deadline
  stops edits; guests can still confirm their unchanged selection. Groups expire
  after 24 hours; locking starts a 60-minute payment window.
- `open → locked → paying → submitted`, or `cancelled` before submission.
  A database function creates the kitchen order and terminal group state in
  one transaction; the existing daily receipt-number trigger remains authoritative.
  Kitchen lines retain each person's name, note and selected ingredient options.

## Payments and recovery

Both modes retain the restaurant's enabled payment methods: Stripe card checkout,
Swish through the existing certificate-backed service, and payment on site. The
organiser selects one method for the entire group (at creation for new split groups,
at locking for host-paid and legacy groups); participants pay
with that method. Disabled methods and fulfillment options are rejected again on
the server. Ordinary and group checkout share server-side ingredient validation. See
[menu architecture](menu-architecture.md) for the required menu-options migration.
There is one immutable
payment share for the organiser or one per participant with items. Integer ore
amounts are computed on the server; each share must meet the 3 SEK minimum.
No loyalty discounts or separate delivery fees are applied in this flow.

Swish uses `/swish/group` on the existing backend (`SWISH_BACKEND_URL` and
`SWISH_INTERNAL_SECRET`), using its current environment, certificates and merchant
alias. Deploy the additive `src/swish-group.ts` router with `src/server.ts`; set
`SWISH_GROUP_CALLBACK_URL` on that backend to the target environment's HTTPS
`/api/group-orders/swish-callback`. **The existing deployed backend has not been
verified to contain these new routes.** Do not enable group Swish until the backend,
callback and reconciliation worker have been verified in the isolated environment.
The ordinary `/swish/create` endpoint now enforces the internal proxy secret;
`/swish/callback` confirms status with a provider GET. Deploy `src/swish-verification.ts`
with the service and validate both ordinary and group payment paths.

Each Swish payer enters their linked Swedish phone number and approves the request
in their existing Swish app (e-commerce flow). Payment and refund instruction UUIDs
are deterministic. Repeating an uncertain request retrieves the same instruction;
callbacks only wake reconciliation. Only an authenticated provider GET with the
expected merchant, payer, reference, amount and currency can confirm payment.
Refunds stay pending at DEBITED and complete only at PAID. The payer number is
private and never included in shared group responses.

Pay-on-site confirmations are not successful money transfers. After all required
confirmations, the atomic order has `payment_method=cash`, `payment_status=unpaid`
and `sale_type=pay_on_site`, matching ordinary cash orders. Receipt numbering and
paid status remain the existing staff-payment flow's responsibility.

Group menu cards reuse `ProductCard`, including its photographs, descriptions,
prices and detail modal. The optional group action adds only to the participant's
selection. The shared configurator requires all mandatory choices, and different
fillings remain separate lines in both the group and personal cart.

Stripe session creation and refunds have stable idempotency keys. Attempt intent
is persisted before calling Stripe. An uncertain session creation is retried with
identical parameters within 23 hours; beyond that it fails closed with
`paymentNeedsReview`, avoiding duplicate charges after Stripe's retention window.

Signed `checkout.session.completed` / `checkout.session.async_payment_succeeded`
events confirm amount, currency, payment identity and session identity. Expired or
asynchronously failed sessions cancel the unfinished group. Redirects
do not confirm payment. All online shares must be paid before the order reaches the
kitchen; pay-on-site orders follow the existing unpaid-order workflow. Shift, fulfillment availability and stock are rechecked at fulfillment.
Incomplete, expired or cancelled groups are never submitted.

Paid shares are refunded if a group is cancelled, times out, or cannot be fulfilled.
Unpaid Checkout Sessions are expired. Cancellation is committed before network
calls. The reconciliation worker recovers missed webhooks, ambiguous session
creation and interrupted refunds; it must run every minute, including when closed.
Provider failures return 503 and logs contain group ID/error category, not contact
details or secrets. Pending refunds are checked again; terminal refund failures
require operator review with the payment provider (`refundNeedsReview`). Never issue a second
manual refund without first checking the recorded refund/payment identity.

## Rollout

For a test deployment, use a separate Supabase project, Stripe test-mode keys and
webhook, and a Swish merchant-test backend. A Vercel Preview URL alone does not
isolate data or payments. Do not inherit production service-role credentials,
email or Telegram delivery credentials. Copy only public menu/content data into
the test database, not customers, orders, memberships or payment records.

1. Back up the database and apply `supabase-migration-group-orders.sql` in staging.
   The migration adds a private table, an optional order FK and a service-only RPC.
2. Set `NEXT_PUBLIC_SITE_URL` to the canonical HTTPS origin and configure the
   existing Supabase and Stripe credentials.
3. Configure `nordic_group_order_worker_url` in Supabase Vault with this environment's
   HTTPS `/api/cron/group-orders` URL. Apply `supabase-schedule-group-orders.sql`;
   it rejects a missing or non-HTTPS URL and does not default to production.
   It creates a dedicated random authentication secret in Vault and service-only
   authorization/readiness functions, following the existing opening-email worker.
   The secret stays in Supabase. Group creation requires an active configured worker.
   `CRON_SECRET` remains an optional override for isolated local/test workers;
   when present it takes precedence, so any external scheduler must use that value.
   Monitor worker HTTP failures and backlog age; a saved schedule is not proof it runs.
4. Ensure the existing Stripe webhook delivers `checkout.session.completed`,
   `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
   and `checkout.session.expired`.
5. Deploy the Swish group routes and configure the group callback on the existing
   Swish backend in the matching environment. Validate Swish creation, approval,
   rejection, timeout, cancellation and refund with merchant test certificates.
6. Set `GROUP_ORDERS_ENABLED=true` only after migration, webhook and worker checks.
   Swish additionally requires `GROUP_SWISH_ENABLED=true` after its separate
   certificate-backed service passes verification. With that flag absent/false,
   new group Swish checkout is rejected while existing callbacks/refunds continue.
   Card and pay-on-site remain governed by business settings.
   Without this flag the menu entry is hidden and creating groups returns 503.
7. Run Stripe test-mode end-to-end checks with two independent browsers: host-paid,
   split, failed payment, abandoned payment, cancellation, refund and delayed webhook.
   Confirm exactly one paid order, correct daily number and participant notes on the
   kitchen screen. No production migrations or payments are performed by tests.

Rollback: disable `GROUP_ORDERS_ENABLED` to prevent new groups. Keep existing group
routes, webhook and worker deployed until every in-flight payment/refund is settled.
Do not drop the table, delete payment records or revert the webhook during recovery.

## Validation and current limits

`npm test` includes pure validation, concurrent service operations with a fake
payment provider, and real SQL migration/transaction tests in isolated PGlite.
`npm run typecheck` and `npm run build` validate integration with the application.
`npm run lint` runs the Next.js core web vitals ESLint configuration across the
repository. Existing hook-dependency and profile-image warnings are not suppressed.

The implementation follows the core [Uber Eats group-order flow](https://help.uber.com/en/ubereats/stores/article/how-to-place-a-group-order?nodeId=3b5e94fc-e5c4-4c74-ac47-61b9fb709d0f),
using Nordic Eatery's visual identity. It is not a claim of pixel-for-pixel parity.
Recurring orders, account-based cross-device session recovery, mixed payment
methods within one group, loyalty, auto-checkout and refunding a submitted restaurant order are outside this
implementation. Submitted-order refunds must be reconciled across all group
payments, not against a single Stripe payment reference.

Inventory is revalidated but not reserved. The existing individual checkout also
does not reserve stock; a complete reservation/decrement policy must cover all
order channels together to avoid double decrements from existing DB triggers.
Polling pauses in hidden tabs and uses one request at a time; rate limiting is the
existing per-process best-effort limiter, not a distributed quota.

Before production enablement, address the existing dependency audit findings and
choose a retention policy for abandoned groups' names/notes/contact details.

## Local preview

The current local preview uses a read-only snapshot of the existing public menu,
site content, public business settings and kitchen status. Group records exist
only in local memory. Production credentials are removed from the preview process;
real payments cannot be completed there. No production data or payment settings
are modified. An isolated database and provider test configuration are still needed
for a hosted test deployment and end-to-end sandbox payment validation. The owner
subsequently authorized a production rollout and intends to check payments there.

Swish protocol references: [payments](https://developer.swish.nu/documentation/guides/create-a-payment-request),
[refunds](https://developer.swish.nu/documentation/guides/refund-a-payment).

## Verification: 2026-10-08

- Architecture / maintainability: shared `ProductCard` and menu categories retain
  the existing menu; only the optional group action changes its destination.
  Labels, filters and group page titles use the existing four locale dictionaries.
- Critical fixes: Swish and pay-on-site no longer depend on an enabled card method.
  A stale payment request cannot charge a newly locked share with a different amount.
  Missing translated home posters reuse the configured Swedish posters, then the
  Nordic Eatery logo, instead of the obsolete Mike's fallback.
- Security: Swish callbacks are wake-up signals, not payment evidence; authenticated
  provider reads validate merchant, payer, amount and reference. Phone numbers remain
  private. Preview public content is read-only and payment credentials are isolated.
- Reliability: provider instruction IDs remain stable through retries; pending
  refunds remain pending; cash confirmations produce unpaid orders.
- Performance: no benchmarked performance claim. Reconciliation of many shares is
  still sequential; worst-case network latency can exceed the worker's 60s duration.
- Tests: payment/service, gateway and SQL tests cover both providers, retry recovery,
  partial payments, cancellation, refund state, cash settlement and disabled methods.
- PASS: `npm test` (16 tests, including schedule isolation and Vault authorization); `npm run typecheck`; standalone backend check
  `tsc --noEmit --esModuleInterop --skipLibCheck --target ES2020 --module NodeNext --moduleResolution NodeNext src/server.ts src/swish-group.ts`.
- PASS: scoped Prettier check and `git diff --check`.
- PASS: `next build` via an isolated environment wrapper. An initial attempt failed
  because the existing booking module instantiates Resend without a key; a nonworking
  placeholder allowed build validation without email credentials or email sends.
- PASS: browser language switching across ru/en/sv/pl preserves the group and
  selected dishes; adding a dish in its detail modal updates the group basket.
- Baseline failure: `CI=1 npm run lint` originally exited into setup because no
  ESLint configuration existed. Added `eslint.config.mjs` and switched to the ESLint
  CLI. PASS: `npm run lint` now reports 0 errors and 6 existing warnings (profile
  `<img>` and hook dependencies in cart, kitchen, tracker, staff and shift components).
  No rules were suppressed or assertions weakened.
- Security fixes: updated Next.js to 15.5.27 and compatible Axios, Resend, DeepL,
  proxy-addr, PostCSS and test-runner dependencies. The PostCSS override keeps Next's
  pinned transitive copy on the same patched PostCSS 8 version as the application.
  See the [Next.js advisory](https://github.com/vercel/next.js/security/advisories/GHSA-4jqv-mc3x-m676)
  and `package-lock.json` for the resolved versions.
- PASS: `npm audit --omit=dev --json` reports 0 vulnerabilities.
- FAIL / remaining development-tool debt: `npm audit --json` reports 9 findings
  (7 high, 2 moderate), down from 24 (including 2 critical). Remaining dependency
  paths belong to Tailwind 3 and ESLint tooling. The proposed automatic fix includes
  a Tailwind 4 major migration or ESLint-config downgrade; neither was applied.
  ESLint 9 is compatible with Next 15 but its upstream support warning also remains.
- PASS: 14 HTTP checks against the isolated running Next.js app: all four locale
  menus/home banners, CSRF denial, private cookies/responses, guest permissions,
  concurrent selections, stale-edit rejection, readiness, closed-kitchen rejection,
  cancellation and worker authentication. Command:
  `node /private/tmp/nordic-final-http-check.cjs`. The closed-kitchen status is the
  saved public snapshot, not a new production status check.
- Deployment access: Vercel browser authentication was confirmed after unlocking
  the Mac. On 2026-10-08, project `nordiceatery111` still assigned the same Supabase
  URL, anon key, service-role key, Stripe secret/webhook keys, Swish backend/secret,
  Resend and Telegram credentials to both Production and Preview. Only scopes were
  inspected; secret values were not revealed. The team's project list showed no
  separate Nordic Eatery test project. CLI login was subsequently completed with
  the owner's browser approval.
- The owner subsequently explicitly authorized production deployment, then separately
  approved a private in-database orders backup, the group migration and the worker.
  See the rollout record below for the operations actually performed.
- NOT RUN / deployment risks: live or provider-sandbox payments,
  Swish backend deployment, hosted test deployment and domain promotion.
  Remaining development dependency findings, untranslated catalog descriptions and the wider
  production-readiness audit remain outside this validation. This is not production
  payment certification.

## Production rollout preparation: 2026-10-08

- Previous deployment: `4Y5FSLz61CnfjRKQBmp7DaNp8rR2`, Git commit
  `60deea96f7f2b018ee4368d2e4284cb93f8eaa98`. Code archive and schema-only exports
  were saved locally for reference. No production order data was exported.
- A private copy of all 49 existing orders is stored at
  `nordic_release_backup_20261008.orders` inside the same Supabase project. RLS is
  enabled; anon, authenticated and service_role have no schema access. This is a
  scoped pre-migration snapshot, not PITR or a complete database backup. Preserve
  it until the rollout is accepted, then handle retention under the site's policy.
- Applied the additive group migration. Verified 49 existing orders, 0 groups,
  denied direct public access and equality of existing order contents with the
  snapshot. A 5s lock timeout prevents waiting indefinitely for the orders DDL lock.
- Live schema inspection exposed `orders.delivery_type` as a PostgreSQL enum.
  Updated the SQL test fixture to use the actual enum/integer column types; it
  reproduced SQL error 42804. Added the explicit enum cast; the regression passed.
- Applied the Vault-backed worker schedule for
  `https://www.nordiceatery.se/api/cron/group-orders`. Verified one configured active
  job and denied anon/authenticated execution of its service functions. Execution
  against deployed code still needs confirmation after rollout.
- Extended the existing Stripe webhook `we_1TReT0JtcyV8JPgnmLK4KkOj` with asynchronous
  success/failure and expiry events. Its URL, signing secret and existing successful
  Checkout event were retained. No payment or refund was created.
- Vercel CLI login was approved in the browser and the existing project linked.
  `.vercelignore` excludes local environment files, IDE/build metadata and unused
  generated image drafts. No production credentials were downloaded from Vercel.
- Production candidate `dpl_CQYQgYnDVgFsiVNpKExQ9qa2a2mJ` reached Ready at
  `https://nordiceatery111-anngrepad-whoami54664s-projects.vercel.app` using
  `vercel deploy --prod --skip-domain --yes --env GROUP_ORDERS_ENABLED=false
--build-env GROUP_ORDERS_ENABLED=false --meta release=group-order-preflight`.
  Vercel authentication protects the deployment. The owner browser loaded its
  existing Swedish menu with all 19 products, images and prices; the unauthenticated
  worker request returned `{"error":"unauthorized"}`. Group creation remains disabled.
- `vercel inspect https://www.nordiceatery.se` after the candidate became Ready
  still resolved to `dpl_4Y5FSLz61CnfjRKQBmp7DaNp8rR2`. The public restaurant domains
  have not been promoted to the candidate. Backend Swish access is required before
  enabling the feature, rebuilding with it enabled, and promoting the final release.
- Production API verification passed: worker readiness is true, a wrong worker token
  is rejected, and anonymous table/function access is denied. Repeated local checks
  passed: 16 tests, typecheck, lint (6 existing warnings), scoped formatting,
  `git diff --check`, isolated build and all 14 HTTP checks. The Vercel cloud build
  also passed; no customer payment or refund was performed.
- The local configuration's earlier `https://api.nordiceatery.se` Swish address
  did not resolve in DNS. The owner identified Hetzner as the backend host and
  logged into the console. Project `NordicEatery` (`14509501`) contains server
  `ubuntu-4gb-hel1-1` (`130022062`), public IPv4 `204.168.189.151`. The address is
  already present in the local SSH known-hosts file, but a strict-host-key,
  batch-mode SSH connection to port 22 timed out. No server files were changed.
- The authenticated Hetzner billing page currently reports services suspended for
  late payment. The owner must resolve the suspension before backend inspection
  and deployment can continue. The deployed Swish service, current Vercel backend
  URL, certificates and ordinary payment health remain unverified. The candidate
  stays disabled and the existing public-domain deployment stays assigned.
- Automatic approval rejected both a local orders export and the initial private
  backup attempt. The owner then explicitly approved the private database backup
  and migration, which succeeded. A bulk Vercel secret export was also rejected;
  deployment continues using the existing cloud configuration without that export.

## Published menu and groups: 2026-10-11

The subsequent authorized release is now published on `https://www.nordiceatery.se`
as `dpl_23S5NLk6ZdoAGt2YrAMSEAvgDW8N`. `GROUP_ORDERS_ENABLED=true` and
`GROUP_SWISH_ENABLED=false` are configured for production. The canonical site URL
was corrected to include `www`, fixing group creation's Origin rejection without
relaxing CSRF checks. The preview environment was not changed.

The menu-options migration preserved existing products and order counts. A private
in-database snapshot retains products, site content and the previous finalizer.
An explicitly authorized Vault-authenticated worker call returned HTTP 200,
`processed=0`, `failed=0`; an anonymous call returned 401. No secret was exported.

The production browser smoke test confirmed the host-paid default, creation,
invitation, joining from another browser session and cancellation visible to both
members. The empty test group remains cancelled; no customer payment or kitchen
order was created. Card is the only currently configured group payment option.
The kitchen is closed, and real checkout/payment remains untested. The Hetzner
server still reports blocked public IPs, so its Swish service was not deployed.
See `menu-architecture.md` for menu/editor verification and rollback constraints.

## Daily slots and independent split payments — 2026-10-11

New groups reserve one of two daily slots, 10:40 and 11:00 in Europe/Stockholm.
A partial unique database index permits one non-cancelled group per timestamp.
Creation reserves the slot, cancellation releases it, and submitted groups retain
it for the day. Passed slots cannot be booked. Availability rolls over at local
midnight and handles DST in PostgreSQL; there is no recurring order or next-day
advance booking. Selection and payment deadlines never extend beyond the slot.
Existing unslotted groups retain their original lifecycle and are not rewritten.

The menu CTA is **SSAB gruppbeställning**, centered, large and red, with a gentle
2.8-second shadow pulse (disabled for reduced-motion preferences). When all times
are booked or passed, a localized one-shot email form replaces the CTA. A private
RLS-protected queue is processed by the existing authenticated group-order cron.
The queue checks availability and cancellation immediately before delivery, leases
one request per claim, uses a stable provider idempotency key, and refuses ambiguous
retries beyond 23 hours. It sends up to five notifications per worker tick within
a bounded budget. This is separate from marketing and kitchen-opening subscriptions.
Users can cancel a pending request through its random-token unsubscribe link.
Notifications do not reserve slots; a slot can be taken while an email is in transit.

For **new split-payment groups**, the organiser selects fulfillment/contact and the
shared payment method when creating the invitation. Each participant can mark their
selection ready and pay immediately while the group stays open. Starting payment
freezes that person's lines and amount; other participants may continue editing or
join before the selection deadline. The organiser cannot remove a paying participant.
The final group lock preserves existing payment identities, paid amounts and frozen
prices. The complete kitchen order is created only after the organiser finishes the
group and every required share is paid/confirmed. Cancelling or expiring an unfinished
group still refunds paid shares through the existing reconciliation path. Host-paid
mode remains the default. No mixed payment methods were introduced.

The kitchen shows the group's reserved time. Audio is enabled by an explicit button
and confirmed with a three-note chime; a test button and mute control are available.
The first successful order snapshot is silent. A new cash order or newly paid online
order triggers the chime once; ordinary refreshes/status edits do not. Requests no
longer overlap, have a 10s abort timeout, and fetch only active statuses. The page must
remain open; browser/OS sleep, muted speakers and suspended audio are not background
push delivery. Re-enable audio after reloading or browser suspension.

### Architecture / critical fixes / security

- Additive `supabase-migration-group-slots.sql`: pickup columns, reservation index,
  immutable-slot and paid-selection guard, order snapshot trigger, service-only
  availability/subscription/queue RPCs. No public access to contact addresses.
- Client buttons are not the capacity boundary; PostgreSQL rejects concurrent
  reservations. Payment intent is durable before provider calls. Existing cookie,
  origin, version checks, pricing, stock and payment verification remain authoritative.
- `GroupMemberPayment` reuses the same checkout UI before and after the final lock;
  model helpers preserve frozen lines while enforcing combined size/amount/stock limits.
- No new package, provider, credential, production test order or test email.

### Reliability / maintainability / performance

One shared availability hook polls without overlap, aborts on unmount, pauses hidden
pages and refreshes on focus. Private notifications reuse the existing worker rather
than adding another scheduler/secret. Kitchen polling no longer downloads historical
completed/cancelled orders. No performance benchmark claim is made.

### Tests / verification

- PASS baseline: `npm test` (42), `npm run typecheck`, `npm run lint` (0 errors,
  4 existing warnings), isolated `npm run build`.
- PASS after implementation: 46 tests, including SQL uniqueness/concurrent claims,
  cancellation, day rollover/DST, immutable paid selections, private queue grants,
  leases/23h cutoff, unchanged idempotent email payload, rejected cross-origin signup,
  kitchen arrival detection and early participant payment/refund service regressions.
- PASS: `npm run typecheck`, `npm run typecheck:swish`, `npm run lint` (0 errors,
  3 remaining existing warnings), scoped `npx prettier --check`, `git diff --check`,
  isolated `npm run build` using fake provider credentials.
- PASS local browser/HTTP: centered CTA; required slot; split setup; individual
  confirmation while another guest is still choosing; one winner/409 for concurrent
  slot creation; full-slot email form; test subscription; cancellation frees a slot;
  audio enable control and newly arriving kitchen card displaying 10:40.
  Local preview uses a virtual morning, fake Supabase and cash confirmations only.
- PASS production migration: private in-database backup schema
  `nordic_slots_backup_20261011` contains 3 groups and 49 orders. Under a transaction
  and bounded lock, all original row contents were compared and preserved. Worker
  readiness true, no email requests created. Today's slots correctly unavailable
  after 11:00. No existing group/order content was changed by the migration.
- PASS publication: Vercel build Ready, candidate menu/group-start/availability
  returned 200 and unauthenticated cron returned 401. Promoted
  `dpl_AbE7u7yn2vj8MBUX3JeHR8MVGP6C` to `https://www.nordiceatery.se`.
  The live API and browser show today's two passed slots and the email form.
  The existing automatic worker returned 200 at 10:39:00 UTC, with
  `processed=1`, `failed=0`, `notifications=0`; no manual authenticated worker call
  was needed. No real reservation, payment or email subscription was created for
  this release verification.
- NOT RUN: real card/Swish money transfers, live email delivery to a subscriber, and
  confirmation of audible output on the actual kitchen tablet/speakers.

### Remaining technical debt / risks

Existing Swish-backend validation, development dependency debt, distributed rate
limits and data-retention policy remain as documented above. Alerts require an open
browser and enabled audio. Reservation creation is public and rate-limited, but there
is no account verification or deposit; an abandoned group occupies its slot until
cancellation or expiry. The two initial daily times can now be changed through the
admin settings described below.

Apply the slot migration before the app. Once independent payments exist, do not roll
back to code that recreates split shares during locking. The database guard fails
closed against such edits, but that older UI cannot finish these groups. To pause a
release, disable new creation with `GROUP_ORDERS_ENABLED=false` while retaining this
payment/reconciliation code until all active groups settle. Keep the additive schema
and backups; do not restore a data snapshot over ongoing orders/payments.

References: [Web Audio autoplay](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay),
[Resend idempotency retention](https://resend.com/changelog/idempotency-keys).

## Admin-managed daily slots — 2026-10-11

**Architecture:** `/admin/settings#group-slots` edits the daily schedule used by
availability, reservation validation and email notifications. The initial 10:40
and 11:00 slots remain enabled. Owners/admins can add, edit, disable or remove up
to 48 unique minute times, including disabling all new group bookings. Times use
Europe/Stockholm. Saving applies immediately to new bookings; already open menu
pages refresh within their existing 10-second polling interval.

**Critical fixes / security:** the database remains the capacity boundary. Its
reservation trigger checks enabled times under a shared schedule-row lock; the
save RPC takes an exclusive row lock and compares the expected version. Concurrent
admin sessions cannot silently overwrite one another. The endpoint checks the
verified staff role, same-origin JSON and bounded input. Service-only RPCs and RLS
hide the configuration table; the save RPC also checks the actor's current role.

**Reliability:** editing/removing a time never rewrites, cancels or shifts existing
reservations or their payment deadlines. Re-adding the same time still respects
any existing booking. Empty schedules return a valid dated empty availability list
and pause notification delivery until another future time is enabled. Nonexistent
spring DST times are skipped; ambiguous autumn times use PostgreSQL's later,
standard-time occurrence, so each configured time still has one bookable instant.

**Maintainability / performance:** one persisted schedule replaces hardcoded times
in the app/SQL. No new dependency or scheduler. Public requests retain their existing
RPC/polling path; there is no additional per-product query or performance claim.

**Tests / verification:** baseline 46 tests, typecheck, lint and isolated build
passed (3 existing lint warnings). New regression tests cover validation, empty
schedules, immutable bookings, repeatable migration, version conflicts, restricted
table/RPC permissions, actor-role checks, DST and notification availability.
Local HTTP checks cover owner access, anonymous/cook denial, CSRF, invalid/duplicate
times, stale/concurrent saves, empty schedules and updated public availability.
Local browser checks cover add/edit/disable/save and conflict/reload behavior.

**Remaining technical debt / risks:** the earlier payment/provider limitations
still apply. This is a recurring daily schedule, without weekday/date overrides
or variable per-slot capacity. Existing reservations remain at their original time
even after the admin removes that time. Adding a future free time may cause the
existing worker to send pending one-shot notifications. Apply
`supabase-migration-group-slot-settings.sql` after the original slots migration
and before this app version. Do not roll back to the hardcoded two-slot app after
customizing the schedule; keep the configuration and current payment code.

**Verification:**

- PASS: `npm test` — 48 tests; `npm run typecheck`; `npm run lint` — 0 errors,
  3 existing warnings; scoped `npx prettier --check`; `git diff --check`.
- PASS: isolated `npm run build` and Vercel build. Local browser also created a
  fake group at the newly configured 21:10 slot; no real booking was created.
- PASS: production migration backed up 3 group rows and 2 prior function
  definitions in private `nordic_slot_settings_backup_20261011`, then compared all
  existing group rows unchanged. Default 10:40/11:00 times remained enabled.
- PASS: candidate menu/availability HTTP 200; anonymous admin API HTTP 401.
  Promoted `dpl_2YnA2QBqVZing3hiQWLRGiLhs8Lz` to `www.nordiceatery.se`.
  Authenticated live owner loaded and saved the same two times successfully;
  public availability still returned 10:40/11:00. No customer orders, business
  settings, shift state or notification subscriptions were changed by verification.
- NOT RUN: a real reservation at a newly added production time or real email
  delivery. Those scenarios were exercised in isolated fixtures/SQL tests only.

## SSAB pickup directions

`GroupPickupDirections` displays the fixed SSAB pickup point
`65.557719, 22.237107`, independently of the truck's daily location. The map link
appears when the server-confirmed payment is `paid`: for all members in host-pay
mode, or immediately for the paid member in split mode. Pending, cash-on-pickup,
expired, refunded and cancelled states do not masquerade as paid. Cancelled
kitchen orders and delivery orders do not show pickup directions. The external
map receives only the coordinates, with no referrer or group/session identifier.

## Ten-person capacity per daily slot — 2026-10-11

This supersedes the earlier one-group-per-slot rule. Each configured time has ten
places shared by multiple groups. The first form field is the participant count,
including the organiser. Leaving that field reserves the count for ten minutes,
ending earlier if the pickup time passes. Other leaders see the remaining places;
open pages refresh within ten seconds. Reading availability never renews a hold.
Changing count/time replaces the same hold atomically. A failed increase preserves
the previous hold; the organiser can explicitly release it.

`group_slot_reservations` is private, RLS-protected and available only through
service RPCs. A hashed HttpOnly cookie owns one draft hold. Version checks prevent
stale tabs changing a newer hold. A bounded schedule-row lock serializes claims,
conversions and schedule changes; the database enforces capacity independently
of the UI. The creation RPC converts a valid hold into an immutable group count
and returns the existing group on retries, without double counting. Concurrent
joins cannot exceed the declared count. Cancelled groups free their places;
submitted groups retain them. The existing group expiry/payment lifecycle still
applies after creation; the ten-minute timeout is for uncreated draft bookings.

Expired holds are excluded immediately, without waiting for cron. Reservation
writes prune at most 100 records older than a day. Existing groups are preserved
verbatim and conservatively occupy all ten places because their intended final
headcount was never recorded. Their legacy membership limit remains unchanged.
No participant data, payment, order or admin schedule is rewritten by migration.

Apply `supabase-migration-group-slot-capacity.sql` after the schedule migration and
before the application. The previous app can run during this migration window:
its new groups count as legacy full-slot bookings. Once multiple groups share a
time, do not restore the former unique index or restore snapshots over live data.
Retain capacity/participant guards and current payment reconciliation during a
rollback; prefer a forward correction or disable new group creation temporarily.

Validation adds SQL coverage for legacy preservation, repeatable migration,
remaining seats, competing claims, atomic movement, stale revisions, ten-minute
expiry, ownership, idempotent conversion, membership limits, cancellation,
submitted capacity, schedule removal and private grants. Isolated HTTP/browser
checks exercise two independent leaders (3 reserved, maximum 7 for the second),
concurrent claims/joins, origin validation, private cookies and release. There is
no new dependency or payment-provider change. Public anonymous booking still
uses per-instance rate limits; verified identities/deposits and distributed abuse
prevention remain separate work.
