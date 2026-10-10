# Admin workspace — 2026-10-08

## Architecture

The authenticated admin layout passes the verified role and display name to one
workspace shell. A persistent top bar, collapsible sidebar, related-section tabs
and independently scrolling content replace the previous oversized header.
The existing cream/red palette, typeface, cards and business screens are retained.
`lib/admin/navigation.ts` owns route labels, groups and navigation visibility.
Page and API authorization remain authoritative.

## Critical fixes

Public-site chrome is hidden only for exact admin routes and their descendants.
Inventory and kitchen display are now reachable from navigation. Product filters
and sorting use URL parameters; resetting filters also resets form fields.
Cards and table rows are smaller, with wrapping for long labels. Russian product
rows measured 62–67 px at a 1440 px viewport; the 390 px view had no horizontal
page/content overflow. Numeric interpolation errors were repaired in Swedish,
Polish and Russian admin copy.

## Security

The server continues to verify the Supabase user and staff role. The overview
now checks management access before loading its data; cooks go to the kitchen.
Search is unavailable to cooks and searches staff only for owners. Filter syntax
characters are excluded from free-text PostgREST search expressions. No auth
bypass, migration, credential change or production write was introduced.

## Reliability

Search cancels obsolete requests and displays dependency failures instead of
silently reporting an empty result. The mobile navigation uses a native modal
with focus containment, Escape dismissal and focus restoration. Navigation resets
the content scroll position. The header no longer resizes after a greeting timer.

## Maintainability

Sidebar and related tabs share one role-aware route map. Density styles are scoped
to the admin workspace in `AdminWorkspace.module.css`; public pages are unaffected.
Some density rules intentionally target existing shared Tailwind utility tokens;
review these rules if page card utilities change.

## Performance

Removed duplicate sidebar profile loads and auth subscriptions; the layout already
loads the verified profile. No benchmarked speed or database performance claim.

## Tests

Added three regression tests covering navigation roles and nested routes, search
filter boundaries, all-locale labels and numeric interpolation. Local HTTP checks
use an isolated Supabase-compatible fixture with fictional accounts and a read-only
public catalog snapshot. The fixture is outside the repository; it is not shipped.
UI checks covered product search, collapsed navigation, mobile modal dismissal,
desktop row height and text overflow. No customer records were copied for preview.

## Remaining technical debt

Six existing lint warnings remain in unrelated profile/cart/kitchen/tracker/staff
and shift code. Existing dashboard totals and analytics queries were not redesigned
or certified by this presentation change. Existing untranslated catalog content
and some older admin action tooltips remain. The wider repository security audit
and group-order payment deployment are separate outstanding work.

## Risks

Verify real authenticated staff workflows before release, including product writes
and large catalogs. Those production writes were not exercised here. This update
is local; it has not been deployed. The earlier group-order rollout still awaits
restoration of the Hetzner backend.

## Verification

- PASS baseline: `npm run typecheck`, `npm run lint` (six warnings), `npm test`
  (16 tests before this change).
- PASS: `npm test` — 19 tests.
- PASS: `npm run typecheck`.
- PASS: `npm run lint` — zero errors, the same six warnings.
- PASS: scoped `prettier --check` on changed admin files and locale dictionaries.
- PASS: `git diff --check`.
- PASS: `node /private/tmp/nordic-admin-http-check.cjs` — 16 local checks for
  locales, filters and anonymous/customer/cook/admin/owner access.
- PASS: `node /private/tmp/nordic-group-build.cjs` — production build using
  isolated nonworking provider credentials; log at
  `/private/tmp/nordic-admin-final-build.log`.
- NOT RUN: production admin writes, production deployment and real payment flows.
