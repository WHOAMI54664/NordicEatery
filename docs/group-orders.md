# Group ordering

The menu entry opens `/{locale}/group-order`. An organiser creates an invitation,
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
  Kitchen lines retain each person's name and note.

## Payments and recovery

Both modes retain the restaurant's enabled payment methods: Stripe card checkout,
Swish through the existing certificate-backed service, and payment on site. The
organiser selects one method for the entire group when locking; participants pay
with that method. Disabled methods and fulfillment options are rejected again on
the server. Ordinary checkout routes and their integrations are unchanged.
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
Ordinary `/swish/create` and `/swish/callback` behavior is retained.

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
selection; ordinary personal-cart actions retain their behavior.

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
