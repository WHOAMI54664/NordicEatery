# Menu and group-order architecture — 2026-10-11

## Architecture

The repository is a TypeScript application: Next.js 15 App Router, React 19,
next-intl (sv/en/pl/ru), Tailwind 3, npm/package-lock, ESLint and Prettier.
Supabase provides PostgreSQL, authentication, Realtime and Storage; the code uses
Supabase clients directly, without an ORM. SQL migrations are standalone root
files. The Vercel website and the certificate-backed Express Swish service in
`src/server.ts` are separate deployments. Stripe, Swish, Resend and Telegram are
external integrations. There is no checked-in CI or container build configuration.
Existing observability is console logging, Vercel analytics/speed insights, Swish
health and persisted group-worker state; this is not complete tracing/monitoring.

`MenuCatalog` now owns category/dietary selection for both individual and group
menus. It renders one category at a time with a horizontal image rail.
`ProductConfigurator` owns the temporary selection and quantity. A native modal
dialog supplies focus containment/Escape behavior and restores focus on close.
`lib/menu-options.ts` owns bounded configuration, selection validation, stable
variant identity and integer-öre price adjustments. It has no I/O dependencies.

Products own `modifier_groups` JSONB. Each group has stable IDs, a name, min/max
choices, and options with names and nonnegative integer-öre surcharges. The admin
editor creates required groups by default (`min = 1`). A “No onion” or “No sauce”
option explicitly represents removal; it can be one of the required choices.
No selection is silently preselected. Existing products default to no groups;
actual ingredients and surcharges must be configured by the restaurant before
customization is offered for those dishes. No invented recipe data is migrated.
Option labels are authored catalog content; interface instructions are translated
into all four locales. Per-option translation fields are not yet provided.

Category slugs remain compatible with existing products. Images reuse the existing
`site_content` and `site-images` infrastructure, under
`menu.categoryImages.<category>` with the existing per-locale storage model.
`/{locale}/admin/menu` edits category photos and titles. Missing category photos
fall back to a product photo, then a neutral icon. Categories are created by adding
a product with that category; arbitrary category reordering is not added.

## Critical fixes

- The personal cart uses product + canonical option IDs as line identity. Two
  fillings no longer merge. Legacy plain-product localStorage carts still load;
  malformed lines cannot crash the cart. Quantities and cart sizes are bounded.
- Cash, Stripe and Swish checkout all resolve selection IDs against current DB
  configuration. Browser names, surcharges and totals are never authoritative.
  Required choices, unknown IDs, stock across variants and price bounds are checked.
- Group editing uses variant identity and member revisions. Changing filling at
  the same quantity still triggers price/limit/stock validation. Removal remains
  possible after a product sells out. Locking freezes exact prices and readable
  option names; SQL fulfillment preserves the structured choices for the kitchen.
- Saving product options/price no longer overwrites existing translated names,
  subtitles and descriptions. Product admin APIs validate prices and config.
- Menu ordering now uses the kitchen-status provider, rather than its permissive
  default context. Server checkout still independently enforces kitchen status.

## Security

Admin roles remain required for product and category-image writes. Image uploads
have bounded size, MIME/signature checks, safe path segments and unique filenames;
a failed content write attempts removal of the newly uploaded object. Spoofed
file types and anonymous writes were rejected against the isolated HTTP fixture.

The checked-in ordinary Swish backend previously accepted unauthenticated create
requests and trusted callback-supplied payment status. Create now checks the
existing internal secret, and callback status is obtained through a certificate-
authenticated provider GET and matched to the stored instruction, merchant,
amount, currency and order reference. Callbacks cannot downgrade a paid order.
Order creation uses insert rather than overwriting an existing order. Exact gross
amount is stored before provider creation, avoiding callback/enrichment timing
and integer `total_price` rounding discrepancies. Sensitive provider payloads are
no longer logged by these handlers. The Next callback reference lookup rejects
PostgREST filter syntax. Provider/proxy calls now have finite timeouts and reject
redirects. This fixes repository code; the deployed backend was not inspected or
changed during this task. Provider API reference:
<https://developer.swish.nu/api>.

## Reliability

Personal cart updates are functional and variant-aware. Group compare-and-swap,
member revisions, payment idempotency and durable cancellation remain intact.
Group refreshes after mutations have timeouts. SQL finalization remains one
transaction and backward-compatible with old groups without selections. The new
migration was applied twice in isolated PostgreSQL-compatible tests.

## Maintainability

The individual/group menus share the same catalog and configurator. Pricing rules
are shared between browser previews and server checkout, with server DB reads
remaining authoritative. Existing Supabase and payment boundaries are retained;
no dependencies or generic service/repository layers were added. The separate
Swish TypeScript check now has a package script because root tsconfig excludes src.

## Performance

Only the active category's cards are mounted. Catalog lookups remain batched;
checkout does not query the DB separately for every option. No benchmark or broad
performance claim is made.

## Tests and verification

Baseline: 19 tests passed, build/typecheck passed, lint had 0 errors/6 warnings.
Prettier check on ProductCard, CartProvider and pricing already failed before edits.
Only changed/refactored modules were formatted; unrelated legacy files were not
reformatted to make a repository-wide check appear clean.

New tests cover required/single/multiple choices, unknown/duplicate options,
forged prices, invalid quantities, aggregated stock, stable variant identity,
legacy/corrupt cart restoration, collective-order option prices/limits, DB config
constraints, migration reapplication, kitchen snapshots and Swish proof matching.
A service regression checks changing a choice at constant quantity cannot bypass
per-person spend limits. The existing concurrency/refund/payment tests remain.

Local browser checks used an isolated in-memory Supabase API with fictional dishes,
local product photos, dummy auth and disabled online payment methods. Checked:
390×844 and 1280×900 layouts; category switching; required fields disabling add;
different fillings in separate cart lines; edited surcharge appearing in the
customer dialog while translated text stays intact; group creation with host-paid
default, selection, readiness, lock and pay-on-site submission to a test kitchen
order. These checks do not establish Stripe/Swish provider success or real storage
availability. A separate HTTP fixture check exercised upload and content-persistence
contracts, anonymous-write denial, malformed images/product prices and missing
required checkout selections. No production data or orders were mutated.

Verification (including the subsequent production rollout):

| Command                                        | Result                                                            |
| ---------------------------------------------- | ----------------------------------------------------------------- |
| `npm test`                                     | PASS — 26 tests, including isolated SQL and payment service tests |
| `npm run lint`                                 | PASS — 0 errors, 5 pre-existing warnings                          |
| `npm run typecheck`                            | PASS                                                              |
| `npm run typecheck:swish`                      | PASS                                                              |
| `npm run build`                                | PASS — production website build                                   |
| `git diff --check`                             | PASS                                                              |
| `npm audit --omit=dev --json`                  | PASS — 0 findings                                                 |
| `node /tmp/nordic-menu-preview/http-check.cjs` | PASS — isolated HTTP contract checks                              |
| Live DB migration and Vercel deployment        | PASS — see rollout record below                                   |
| Live Stripe/Swish payment transactions         | NOT RUN                                                           |

Scoped formatting passed with the following actual commands (wrapped here):

```sh
npx prettier --check lib/menu-options.ts lib/cart.ts lib/products-input.ts \
  lib/orders/pricing.ts lib/group-orders/model.ts lib/group-orders/store.ts \
  components/menu/*.tsx components/admin/ModifierGroupsEditor.tsx \
  components/CartProvider.tsx components/ProductCard.tsx \
  components/group-orders/GroupOrderMenu.tsx components/group-orders/GroupOrderRoom.tsx \
  tests/menu-options.test.ts tests/group-orders-database.test.ts \
  tests/group-orders-service.test.ts src/swish-verification.ts tests/swish-verification.test.ts
npx prettier --check --tab-width 4 app/api/products/create/route.ts \
  app/api/products/update/route.ts src/server.ts
```

The HTTP fixture script is a temporary local verification artifact, not a
production command or a committed integration harness. Full dependency
`npm audit --omit=dev --json` returned zero production vulnerabilities after a
sandbox DNS failure was retried with network permission. Development-tool audit
findings were not rechecked in this task.

## Remaining technical debt

- Live Swish deployment/certificates/callbacks still need verification before
  enabling group Swish payments. The group worker was verified after publication;
  card checkout remains configured independently. See the rollout record below.
- Ordinary Swish v1 create still lacks durable recovery for an ambiguous provider
  create/DB persistence failure; do not blindly retry or issue manual refunds.
- Cross-order inventory reservation/decrement and uniqueness depend on the live
  schema/triggers, which are not fully versioned here. This review added aggregate
  checks, not a new cross-order stock reservation system.
- Legacy lint warnings, inconsistent legacy formatting, missing CI, process-local
  rate limiting and full observability remain. Security policy/older AUDIT content
  need a separate full-repository reconciliation. No production-grade certification
  is implied by this menu-focused review.

## Risks and rollout

1. Back up the target DB and test against isolated credentials first. Apply
   `supabase-migration-group-orders.sql` if not already installed, then
   `supabase-migration-menu-options.sql`. The latter adds a column/constraint and
   replaces the finalizer to retain options; a 5-second lock timeout limits DDL waits.
   Explicit option-aware SELECTs intentionally fail closed if the migration is absent.
2. Deploy both Next.js and the Swish backend with the existing matching
   `SWISH_INTERNAL_SECRET`. Verify provider callbacks, amount matching, replay,
   refunds and recovery in merchant-test mode. Do not treat a Next build as proof
   that the separate service is updated. Enable the group feature only after its worker/payment prerequisites pass.
   Keep `GROUP_SWISH_ENABLED=false` until the separate Swish service is verified;
   the website can offer configured card/pay-on-site methods independently.
3. Configure real groups/options in product admin and category images in each
   required locale. Use required groups for meat/filling/sauce and explicit removal
   options. Verify a real kitchen ticket/receipt retains all choices before launch.
4. Use a forward fix for payment security. Keep the additive DB column and historic
   order snapshots on rollback; never drop data to roll back this release. Before
   reverting to pre-option checkout, pause new orders and resolve active configured
   groups/carts, since old code cannot safely price or distinguish their choices.

The initial isolated validation did not apply production changes. The subsequent
owner-authorized migration and publication are recorded below. Real recipes and
provider transactions remain unconfigured/untested by this task.

## Production rollout — 2026-10-11

The owner authorized the live migration and publication, and will configure real
ingredients through product admin. Existing recipe data is not seeded.

- Database backup and menu migration committed in one transaction. Private schema
  `nordic_menu_backup_20261011` holds products, site content and the previous group
  finalizer. No customer/order data was exported. Backup access is denied to anon,
  authenticated and service_role; snapshots have RLS enabled.
- All 24 existing products compared equal after excluding the new options column;
  49 orders and zero groups remained. Configuration constraints and finalizer
  permissions passed. A preflight checksum initially stopped the transaction;
  comparing live SQL confirmed only comments/whitespace differed from baseline.
- Hetzner reports both public IPs blocked; strict SSH to 204.168.189.151 timed out.
  Group Swish checkout now has its own default-off flag. Callbacks, cancellation
  and refunds for existing payments are unaffected. Service tests verify both.
- Stripe live webhook is enabled with completion, async success/failure and expiry
  events. The DB worker is configured and reports ready. No payment was created.
- Previous public deployment: `dpl_GhAdYHysV1JmEpS9iNBtSsNBAoca`.
- First menu deployment: `dpl_3JNmViabPvNfuLyH29WEeogqqQ3y`, promoted and verified
  on the canonical domain. An explicitly authorized one-time Vault-authenticated
  worker request returned HTTP 200 with `{"processed":0,"failed":0}`. The secret
  was not exported or printed. Anonymous worker requests returned HTTP 401.
- Live browser checks confirmed the category rail, product modal, category image
  control and title editor, and the ingredient editor with required min/max 1.
  Unsaved editor probes were discarded; no recipes or category content changed.
- Live group creation found a deployment configuration mismatch: the canonical
  `www` origin returned 403, while a non-`www` origin reached input validation.
  Production `NEXT_PUBLIC_SITE_URL` was corrected to `https://www.nordiceatery.se`;
  strict Origin validation remains unchanged. Vercel required replacing the legacy
  Secret-typed public URL with a Config entry. Preview configuration was retained.
- Final local checks passed: 26 tests (including Unicode category IDs and the
  separate Swish flag), both TypeScript checks, lint (5 existing warnings), scoped
  formatting and diff checks. Vercel also built the production application.
- Final public deployment: `dpl_23S5NLk6ZdoAGt2YrAMSEAvgDW8N`, verified READY on
  `https://www.nordiceatery.se` after `vercel promote`. The canonical-origin probe
  reaches input validation (HTTP 400 for an empty body), rather than HTTP 403.
- Live browser smoke test created an empty host-paid group, joined it from a
  separate browser session, verified two members and synchronized cancellation.
  The test group `812aa447-2151-4f07-a87d-cb726f05448e` remains cancelled for audit;
  no payment or kitchen order was created. The room offered only the configured
  card method. Kitchen opening, recipe setup and real provider transactions were
  not part of this smoke test.
- Final SQL verification: 49 orders, 24 products, cancelled test group, and all
  original product fields still identical to the pre-migration snapshot.

## Home category follow-up — 2026-10-11

The homepage's four independently editable category shortcuts could diverge from
the real menu and all pointed to the same unfiltered page. Home and `MenuCatalog`
now share `getMenuCategories`: available categories, ordering, translated/custom
titles and category-photo/product-photo fallbacks. Home reads the same menu content
and available-product filters; its bounded product query also supplies the six
popular cards. Existing home/category data was not deleted or rewritten.

Each home card links to `menu?category=<encoded-id>#menu-catalog`. Unknown/empty
categories fall back to the first available category. The selected tile scrolls
into the horizontal rail on mobile, including direct links to custom categories.
Category edits continue through menu admin for the selected locale.

Verification: 26 tests, typecheck, lint (0 errors/5 existing warnings), scoped
Prettier and diff checks passed. Browser navigation to a custom category and a
Unicode category (`Tillbehör`) selected the correct products; the latter was also
checked at 390×844. The existing local preview reported public-shift lookup errors
and a Next smooth-scroll warning; no checkout or data write was performed for
these homepage checks. The Vercel production build passed and deployment
`dpl_Gwgx6odHZQ4sBd8N98499h7RpnEY` was promoted. The public Swedish homepage shows
all seven current categories, including the owner's latest `Polsk kebab` label.
A live click on `Sallad` opened the selected salad category with its two products.
No additional migration or production content change was needed for this follow-up.

## Meal and drink combo — 2026-10-11

### Architecture

After a valid meal configuration, Add opens a drink offer with catalog photos,
current prices, a visible 5 SEK saving and a skip button. Required drink modifiers
use the same `ModifierChoices` component. The chosen meal and drink are added in
one cart update / one version-checked group request. Quantities can differ, up to
one offered drink per chosen meal. Homepage popular cards use the same flow.

`lib/meal-combo.ts` owns the promotion: one drink receives exactly 500 öre off per
main dish in categories `maczanka`, `knysza`, `burgare`, `sallad`, `fries`, and
`varma-rtter` (also `varma-ratter` / `varma-rätter`). The owner
confirmed that sides and sauces do not qualify. Drinks priced below 5 SEK are not
eligible. Category display names/photos can still be changed in menu admin.

The discount is recalculated for any eligible meal/drink basket, including items
added separately. Drinks consume available meal quantities in basket order. Group
members qualify within their own basket, for both host and split payment. Removing
food removes any excess discount. Existing locked groups keep their frozen prices.

### Critical fixes / Security

Regular and group checkout derive eligibility from server-read catalog categories,
prices and validated modifiers. Client price/discount/category fields cannot grant
savings. The cart keeps original unit prices; only derived pricing is discounted.
Reloading the cart therefore cannot compound a discount.

### Reliability / Maintainability

Partially discounted drink quantities become separate priced lines. This preserves
integer öre, payment totals, VAT, kitchen snapshots and refunds without a schema
migration. Group display combines these portions when showing one editable item.
Stripe's 100-line limit is checked before inserting a pending order, including a
possible delivery line. Atomic additions preserve existing quantity/line limits.

### Performance

No additional catalog request is needed: the loaded menu supplies available drinks.
Promotion calculation is linear in the bounded cart size. No new dependencies.

### Tests / Verification

- PASS: baseline `npm test` (26 tests), followed by 31 tests with combo regressions.
- New cases cover partial drink quantities, exclusions, removing food, storage
  reload, atomic cart failure, forged discounts/categories, required modifiers,
  surcharges/stock, per-member limits and exact host/split payments.
- The isolated PostgreSQL finalizer test preserves two differently priced portions
  of a drink and verifies the persisted order total.
- Browser checks run on a separate in-memory catalog at port 3002: mandatory meal
  and drink options, combined addition, checkout total, removing a meal/reloading,
  and group addition/locking with one meal and two drinks.

### Remaining technical debt / Risks

Changing a category's internal ID or adding another type of main dish requires
updating the eligibility set. Editing category titles/photos does not. Existing
loyalty rewards apply after combo pricing. No real provider payment is made during
these checks. The previously blocked standalone Swish backend remains unchanged;
its production connectivity is outside this release. No database migration or
production menu data edit is needed.

### Final release verification

- PASS: `npm run typecheck`, `npm run typecheck:swish`, `npm test` (31/31),
  `npm run lint` (0 errors, 5 existing warnings), scoped `npx prettier --check`,
  `git diff --check` and Vercel `npm run build`.
- PASS: `npm audit --omit=dev` reported zero vulnerabilities. The install log's
  nine advisories concern development dependencies and were not changed here.
- PASS: 390×844 browser check including skip; isolated group checkout locked a
  one-meal/two-drink basket at 174 SEK, with exactly one 5 SEK discount.
- Published `dpl_6EPbtcAPJeFTaF4j2BZPM1uZXTfr` after a READY candidate and HTTP 200
  menu probe. Previous public release: `dpl_Gwgx6odHZQ4sBd8N98499h7RpnEY`.
- Live browser: Polsk Kebab 115 SEK + Pepsi 25→20 SEK = 135 SEK. The required meat
  choice precedes the drink step. Proof: `release/live-meal-combo.png` in this
  chat's artifact directory. Kitchen remains closed; no order/payment was created.
- NOT RUN: real Stripe/Swish transactions, standalone backend deployment.

## Foodtruck geolocation — 2026-10-11

### Architecture

The admin overview now owns an editable location draft: address, latitude and
longitude, a one-shot device position button, reported accuracy and map preview.
The operator must press Save location to publish it. `action: location` updates
only location columns and `updated_at`; opening/closing and opening emails retain
separate behavior. Manual coordinates support decimal commas. All four locales
are translated. Homepage, menu and pickup checkout share `FoodTruckLocation` and
use the already loaded shift. Closed shifts expose no location through this
public helper. Saved coordinates take precedence over address-only map search.

### Critical fixes / Security

The old broad fallback could open a shift after its location update failed. It is
removed: database failure or a missing shift returns 503. The admin GET and POST
both require an owner/admin role; POST validates JSON, origin, address length and
finite paired coordinates. Map URLs have a fixed Google Maps origin with encoded
query values. Production shift RLS is enabled with no direct client policies; this
release leaves its grants and policies unchanged.

### Reliability / Maintainability / Performance

Location validation and update payload construction are shared pure functions.
Database constraints enforce paired coordinates and latitude/longitude bounds.
`supabase-migration-truck-location.sql` adds nullable columns without changing
existing rows. The public reader supports the old schema during rollout; writes
never discard failed location updates. Browser GPS has bounded waiting, cancel
handling and localized permission/timeout errors. No watchPosition, map SDK,
background tracking, new dependency or extra public database request is added.

### Tests / Verification

- PASS: baseline 31 tests and typecheck; after changes 37 tests including coordinate
  bounds, decimal commas, safe map links, unchanged shift metadata, GPS error
  mapping and repeatable migration in isolated PostgreSQL.
- PASS: local API checks (port 3003 and in-memory database port 45453): anonymous
  401, owner save 200 with unchanged status/opening time, malformed input 400,
  foreign origin 403, cook GET/POST 403, missing-row open 503 without fallback.
- PASS: browser save/reload, invalid coordinate rejection, exact map link on menu,
  and 390×844 admin layout. Test coordinates exist only in the isolated fixture.
- PASS: production migration with private RLS-protected backup
  `nordic_menu_backup_20261011.restaurant_shift_before_location` (one row).
  Verification returned `shift_unchanged=true`, `coordinates_empty=true` and
  `constraint_installed=true`. The current kitchen is open.

### Remaining technical debt / Risks

Actual phone GPS accuracy and permissions depend on the operator's browser and
must be checked at the truck. Device position is never automatically published;
review the map and save. This is a manually refreshed business location, not live
tracking. No real device location was obtained or written during verification.
Deploy the additive migration before the app; rollback the app without dropping
its nullable columns. No payment or production opening/closing operation is part
of these checks.

References: [browser geolocation](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation/getCurrentPosition),
[Google Maps URLs](https://developers.google.com/maps/documentation/urls/get-started).

### Final location release verification

- PASS: `npm test` (37/37), `npm run typecheck`, `npm run typecheck:swish`,
  `npm run lint` (0 errors, 4 existing warnings), scoped `npx prettier --check`,
  `git diff --check`, Vercel `npm run build`, `npm audit --omit=dev` (0 findings).
- PASS: candidate menu HTTP 200 and unauthenticated admin API HTTP 401.
- Published `dpl_HECHnmLBCfjAfhKU1CUPKUQ9bx11`
  (`nordiceatery111-7nh7dwepq-whoami54664s-projects.vercel.app`) to the existing
  domain after checks. Rollback target: `dpl_6EPbtcAPJeFTaF4j2BZPM1uZXTfr`.
- PASS: authenticated live admin loads the open shift, existing address, empty
  coordinate fields and enabled GPS/save controls. Public Swedish menu shows the
  address and map link. Proof: `release/live-truck-location-admin.png` in this
  chat's artifact directory. No production save/open/close was performed.
- NOT RUN: actual phone GPS reading and saving a real new production point.

## Homepage map and synchronized address — 2026-10-11

The embedded-map presentation below is historical; the owner's subsequent
address-only request supersedes it in the final section of this document.

### Architecture

`FoodTruckMap` replaces the homepage's compact location link with an embedded
OpenStreetMap after the hero. `GET /api/truck-location` returns only the public
open/closed state, address, coordinates and whether the map point is approximate.
The saved GPS point always wins. For an existing address without GPS, cached
Photon forward geocoding supplies an explicitly approximate map point, without
writing anything to the database or replacing the owner's address.

The client refreshes every 20 seconds while visible, on focus/visibility return,
and through BroadcastChannel immediately after a save in another same-origin
browser tab. Requests do not overlap, are aborted on unmount and have a timeout.
Address and marker update from one response. An unchanged iframe URL stays mounted.
Closed shifts hide the location, including from the public API response.
The owner explicitly confirmed this visibility rule: display the map and address
only while the shift is open.

### Critical fixes

Changing coordinates in the admin form clears the previous address. GPS capture
also resolves the new address for review. A separate Find address action supports
manual coordinates. Resolving an address never writes the shift. Saving blank or
unchanged old address text alongside a changed point resolves it server-side
before the atomic update, so failure cannot pair a new pin with an old address.
Manual corrections are retained. The precise GPS coordinates are never replaced
by a nearby street coordinate returned by the geocoder.

### Security

Address resolution reuses the authenticated owner/admin shift endpoint and origin
checks, with input validation and rate limiting. The public endpoint accepts no
search query or user-supplied location. Geocoder requests use only a server-configured
Photon endpoint, bounded response size, HTTPS, a timeout and no redirects. Client
address text cannot choose an outbound host. Closed-shift coordinates and staff
metadata are not exposed. No secrets, device GPS or coordinates are logged.

### Reliability / Maintainability / Performance

No new dependency or migration. Photon responses are cached for 24 hours using
Next's shared fetch cache; map polling reads the saved shift, not a fresh reverse
lookup. Requests for address lookup are explicit admin actions, not autocomplete.
`TRUCK_GEOCODER_URL` can select a compatible Photon service; the default is
`https://photon.komoot.io/`. Plain HTTP is allowed only for the loopback test
fixture in development. Saved address/manual input and directions remain usable
if a geocoder or embedded map is unavailable. Polling pauses in hidden tabs.

### Tests

Six new regression tests cover moved-point addresses, manual corrections, failed
lookups, retained exact GPS, safe finite embed bounds, closed-state redaction,
malformed external data, longitude/latitude order and bounded cached requests.
The local HTTP fixture additionally verifies authenticated read-only lookup,
owner/cook/guest boundaries, atomic saved address/point pairs, no-store public
responses and closed-shift redaction. Browser checks confirmed a changed point
and address on an already open homepage without reload, plus mobile 390×844 layout.

### Remaining technical debt / Risks

Photon's public service permits moderate project usage but provides no availability
SLA. Address suggestions need operator review and may identify a nearby street
without a house number. High traffic/operational requirements should use a managed
or self-hosted compatible service. The homepage map uses OSM's standard embed and
attribution. API refreshes use a small database read per visible visitor every
20 seconds; there is no persistent WebSocket or new database publication.

References: [Photon API and service policy](https://github.com/komoot/photon),
[Photon API contract](https://github.com/komoot/photon/blob/master/docs/api-v1.md),
[OSM embedding](https://wiki.openstreetmap.org/wiki/Export).

### Verification before publication

- PASS: baseline `npm test` (37/37) and `npm run typecheck`.
- PASS: `npm test` (43/43), `npm run typecheck`, `npm run lint` (0 errors and 4
  existing warnings), local API script and desktop/mobile browser checks.
- PASS: external forward and reverse lookups for the existing public business
  address. No actual device location was read and no production shift was saved.

### Homepage category shadows

The horizontal category scroller clipped the shared `glass-card` shadow, creating
a rectangular dark band around the catalog. A local `shadow-none` utility removes
shadows from these category links without changing the shared card component.
Browser computed styles confirm zero-size transparent shadows on every category.
Scoped Prettier and `git diff --check` pass after this small visual correction.

### Published verification

- PASS: `npm test` (43/43), `npm run typecheck`, `npm run typecheck:swish`,
  `npm run lint` (0 errors, 4 existing warnings), scoped `npx prettier --check`,
  `git diff --check`, Vercel `npm run build` (47 seconds).
- PASS: `node /tmp/nordic-map-preview/check-api.cjs` and
  `node /tmp/nordic-map-preview/check-poll.cjs` against the isolated in-memory
  fixture. Browser checks also confirmed immediate same-origin tab refresh and
  mobile 390×844 rendering. No live location or orders were changed by these tests.
- Published `dpl_6TAGPmRA9eVzULjcLsmPuu9VfJgA`
  (`nordiceatery111-n5iifjapu-whoami54664s-projects.vercel.app`) to the existing
  domain. Rollback: `dpl_HECHnmLBCfjAfhKU1CUPKUQ9bx11`. No database migration.
- PASS: candidate homepage/public location HTTP 200, anonymous admin HTTP 401.
  The live public endpoint returns only closed state and null address/coordinates.
  Browser verification confirms the map is hidden while closed and all seven
  homepage category cards have no visible shadow. Proof:
  `release/live-homepage-no-category-shadows.png` in this chat's artifacts.
- PASS: authenticated live admin loads the saved shift with new address-lookup
  controls. No production save/open/close action was performed.
- NOT RUN: actual phone GPS capture or saving a new real production location;
  the live shift is closed, so open-shift map updates were verified in the fixture.
- Remaining warnings are the pre-existing profile image and three hook dependency
  warnings recorded above. Geocoder availability/accuracy remains the external
  dependency described in Risks; manual address correction remains available.

## Homepage address without embedded map — 2026-10-11

### Architecture / Critical fixes

The owner requested removal of the map while retaining the displayed address and
Swedish `Hitta hit` button. `HomeFoodTruckLocation` now renders the address card
without an iframe or map placeholder. The existing auto-refresh and closed-shift
visibility rule remain. The directions link uses saved GPS when present and the
address otherwise. Address lookup and editing in the admin remain available.

### Security / Reliability / Maintainability / Performance

Closed-shift address/coordinates remain redacted. The public refresh endpoint
no longer calls a forward geocoder to create an approximate map marker, so it
depends only on the saved shift. The obsolete embed URL builder and forward
lookup function were removed. Reverse address lookup retains its authentication,
validation, timeouts and cache. The public JSON shape remains backward-compatible.
The homepage no longer loads map tiles or an embedded external page.

### Tests / Verification

- PASS baseline: `npm test` (43/43), `npm run typecheck`.
- PASS after change: `npm test` (42/42), `npm run typecheck`,
  `npm run typecheck:swish`, `npm run lint` (0 errors, 4 existing warnings),
  scoped `npx prettier --check`, `git diff --check`.
- Removed only the obsolete embed-specific test with its deleted feature;
  address validation, reverse-geocoding and closed-state protection tests remain.
- Local fixture checks cover address-only links, coherent address/GPS refresh,
  closed-shift redaction and absence of the embedded iframe.

### Remaining technical debt / Risks

The existing four lint warnings remain. No migration or production data change is
needed. Real phone GPS capture is outside this visual change; working production
shift state and saved location are preserved.

### Publication

- PASS: Vercel `npm run build`, candidate homepage and public location HTTP 200,
  desktop and 390×844 mobile visual checks, automatic address/directions update
  on an already-open page without reload. No embedded iframe remains.
- Published `dpl_FJcS6f2yGNvUAxcDrMyzeDWW9vj2`
  (`nordiceatery111-l10rf1gul-whoami54664s-projects.vercel.app`). Rollback:
  `dpl_6TAGPmRA9eVzULjcLsmPuu9VfJgA`.
- PASS: live homepage loads after promotion and has no map. The live shift is
  closed, so the address card correctly remains hidden. Its open-state display
  was verified using the isolated fixture, not by opening a production shift.
- Proof of the requested open-state display with test data:
  `release/address-only-preview.png` and `release/address-only-mobile-preview.png`.

## Remove decorative eyebrows throughout the site — 2026-10-11

### Architecture / Critical fixes

Removed 39 decorative pre-headings from 28 public/admin React components,
including homepage sections, the foodtruck address, menu, product customization,
booking, localized landing pages, cart/checkout, profile and admin page headers.
The booking confirmation email template also drops its decorative pre-heading.
Heading spacing and right-aligned dialog/catalog controls are adjusted locally.
This removes the elements themselves rather than hiding generic uppercase text.

### Security / Reliability / Maintainability

Authentication, transactions and data flows are unchanged. Structural comparison
against the pre-edit source verifies that all headings, buttons, form fields,
labels and links remain present. Operational status badges, product badges,
navigation group names and table/field labels remain available. Obsolete copy in
all four locales and unused decorative icon imports are removed. Existing saved
CMS content is preserved, but the removed pre-headings are no longer rendered.

### Performance / Tests / Verification

No new dependencies or database migration. Fewer decorative DOM nodes and unused
translation strings; no performance benchmark claim. No new tests for this
presentation-only change. Baseline `npm test` (42/42) and `npm run typecheck` pass.
After editing, `npm test` (42/42), both type checks, lint (0 errors, 4 existing
warnings), structural comparison and `git diff --check` pass. Source scanning
finds no remaining eyebrow references in app/components/lib/messages.

### Remaining technical debt / Risks

Scoped Prettier check reports the same 19 already-unformatted files before and
after the change, with no new formatting failures. They were not reformatted
wholesale. Existing lint warnings remain. Email sending and production bookings,
orders, shift state and location are not exercised or changed by this release.

### Publication / Final verification

- PASS: 21 local page checks across sv/en/ru/pl return HTTP 200 without missing
  translation errors. Browser checks cover the homepage, customization dialog,
  admin dashboard/settings and 390×844 booking page.
- PASS: Vercel `npm run build` (41 seconds), candidate homepage/menu/booking
  HTTP 200 and anonymous admin shift API HTTP 401.
- Published `dpl_5UEwQ6hbCXrJQhTEtgafed7JkBri`
  (`nordiceatery111-qpo0x5lej-whoami54664s-projects.vercel.app`). Rollback:
  `dpl_FJcS6f2yGNvUAxcDrMyzeDWW9vj2`.
- PASS: live homepage browser verification confirms the foodtruck address,
  `Hitta hit`, categories and `Bästsäljare` heading remain, while `VÅRA`, the
  location eyebrow and the SEO-section eyebrow are absent. The shift was open
  when verified; no production save or shift action was performed by the agent.
  Proof: `release/live-no-eyebrows.png` in this chat's artifacts.
- NOT RUN: real booking/email submission or production order/payment mutation.

## Remove the address refresh footer — 2026-10-11

Removed the `Adressen uppdateras automatiskt` caption, `Uppdatera` button and
their footer divider from `HomeFoodTruckLocation`, including unused translations
in all four locales. The address, heading and `Hitta hit` link remain.
Automatic polling, focus/visibility refresh, the admin-save BroadcastChannel,
timeouts and cleanup remain; the unused manual-refresh/error display state is
removed. A failed read retains the last known location and retries on schedule.
No API, authorization, migration or production data changes.

Baseline and updated `npm test` pass (42/42), as do type checks, lint (0 errors,
4 existing warnings), scoped Prettier and `git diff --check`. The visual change
does not need new unit tests; its automatic refresh is checked in the existing
isolated fixture. Existing unrelated formatting debt is unchanged.

- PASS: the already-open fixture page automatically updates both the address
  and directions URL after a location change, with zero refresh buttons.
- PASS: Vercel production build (37 seconds), candidate homepage/location
  HTTP 200, live browser confirmation of retained address and `Hitta hit`, zero
  refresh buttons and no automatic-update caption.
- Published `dpl_7de67kTu6ek7YK7BbUj49irk6Zcn`
  (`nordiceatery111-jec7mjnby-whoami54664s-projects.vercel.app`). Rollback:
  `dpl_5UEwQ6hbCXrJQhTEtgafed7JkBri`. Proof: `release/live-clean-address.png`.

## Optional subtitles and side sauces — 2026-10-11

Product subtitles are optional in both admin forms. Create/update normalize an
omitted, null or blank subtitle to empty text, matching the existing NOT NULL
base column. Clearing the base subtitle also clears its localized copies. No
database migration is required.

`lib/menu-offers.ts` maps side categories (`tillbehör`, `tillbehor`, `sides`)
to a sauce offer using available `dip`/`sauces` products. Main dishes retain
the existing drink combo. `AddonOffer` shares the selector, quantity and modifier
validation. Sauces keep their catalog price and add a separate cart/group line;
skipping adds only the side. Stock, line limits and authoritative server pricing
continue through the existing cart/group-order paths.

## Product description editing

The product form sends its locale with a save. The update endpoint refreshes the
description for that language as well as other language copies still matching
the previous source. Independent translations in other languages remain intact;
explicit translated input takes precedence. Public menu, home and group-order
routes are revalidated after saving. Product details preserve manual line breaks
and spaces. No catalog rewrite or translation backfill runs during deployment.

## Category names

Category IDs remain stable when renaming. The product form, product list, menu and homepage read the same localized `menu.categories.*` content keys. Owners and admins can rename the selected category with its pencil in the product form; saving updates the entire category in that language and invalidates its locale's pages. Existing Swedish IDs such as `tillbehör` are supported. Product assignments and category image keys do not change.
