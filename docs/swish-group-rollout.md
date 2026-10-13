# Swish group backend rollout — 2026-10-13

## Architecture and scope

The website owns group membership, capacity, the common deadline, payment shares,
and atomic kitchen submission in Supabase. The separate Hetzner service owns the
merchant TLS identity and talks to Swish. `/swish/group` is transport only: it does
not insert individual orders or receive browser-supplied prices directly.

SSH audit of `nordic-swish` confirmed a production PEM certificate/key pair, no
group route and no `SWISH_GROUP_CALLBACK_URL`. The remote ordinary checkout is a
larger, different implementation with VAT snapshots, email/loyalty and status
routes. **Do not deploy the repository's entire `src/server.ts` over it.**

The reviewed [entrypoint patch](../ops/swish-group-20261013.patch) applies only to
the remote file whose SHA-256 is
`6b7c85fe989c806b9765c7bfce89d5e734dbf188f1f3199c2ff8efad685ce7bb`.
It mounts `swishGroupService()` and keeps those ordinary-order contracts.
The added modules use already installed dependencies; no database migration or
certificate replacement is required by this change.

## Critical fixes and security

- Missing/malformed ordinary callback IDs are rejected before database access.
  Previously, a missing ID could skip the provider GET in the deployed entrypoint.
  Production callback fields other than ID are discarded; a provider response
  must match that ID, merchant and currency. CREATED does not mark an order failed.
- Internal authentication uses constant-time comparison. Group replies validate
  payer, merchant, reference, amount, currency, status and paid transaction reference.
- Group transport supports PEM/key and PFX, requires an explicit environment,
  rejects conflicting legacy API URLs and cannot redirect the client certificate
  to another host. TLS verification remains enabled.
- The entrypoint patch removes raw Axios exceptions, token-bearing response
  headers and payment payloads from ordinary-handler logs.

## Reliability and maintainability

Group instructions retain deterministic IDs for reconciliation of lost replies.
An uncertain request is looked up again; a refund is complete only at PAID.
All calls within a group gateway operation share a 12-second abort signal, shorter
than the website's 15-second timeout. Requests also have a 10-second timeout,
redirects disabled and a 64 KiB response limit. Existing ordinary provider calls
receive bounded timeouts and disabled redirects in the additive patch.

The service wrapper is the single group transport entrypoint for both local code
and the additive production patch. It initializes certificate transport only after
authentication/input/configuration checks, so absent group configuration cannot
take ordinary checkout offline. No performance benchmark improvement is claimed.

## Verification

- PASS baseline: 83 tests; website and Swish type checks; lint (three existing
  warnings, no errors); isolated Next production build with dummy provider keys.
  The first isolated build lacked a dummy Resend key; rerun with that fixture passed.
- PASS added tests: PEM/PFX configuration, environment conflicts, TLS/redirect/
  timeout constraints, malformed/mismatched provider data, HTTP auth and health,
  and missing-ID callback rejection. Existing concurrent payment, cancellation,
  single-order and refund service regressions remain required.
- PASS final commands: `npm test` (87/87), `npm run typecheck`,
  `npm run typecheck:swish`, `npm run lint` (zero errors, three existing warnings),
  scoped `npx prettier --check`, `git diff --check`, isolated `npm run build`, and
  `npm run build --prefix /tmp/nordic-swish-group-release-20261013/candidate`.
  Local HTTP tests require loopback-listen permission in the execution sandbox.
- PASS candidate: TypeScript build with the exact deployed `package-lock.json`.
  Local HTTP smoke ran its actual entrypoint with fake credentials and a stubbed
  provider: preserved health, rejected ordinary/group unauthorized requests,
  rejected forged/missing-ID callbacks, ignored unverified incoming PAID and
  rejected a mismatched provider ID. No production database was used.
- PASS official MSS: public `MSS_test_3.0.zip` certificates from the
  [Swish environment documentation](https://developer.swish.nu/documentation/environments).
  Verified create/read/retry → PAID, refund/retry → CREATED → DEBITED → PAID,
  and cancellation → CANCELLED using the candidate group gateway. These were
  synthetic simulator transfers, not real money. Callback destination was
  `https://example.com/nordic-swish-mss`; state was verified by polling.
- PASS read-only production: SSH; matching certificate/private key; certificate
  expiry 2031-09-23; authenticated Swish GET for a fresh nonexistent instruction
  returned 404; website availability 200; GET callback 405; unauthenticated cron 401.
  These HTTP checks do not prove callback delivery or scheduled worker execution.
- PASS scoped formatter and diff checks for new/updated modules and tests.
  `src/server.ts` already failed default Prettier before this change (legacy
  four-space indentation); it was not reformatted wholesale.
- NOT RUN: real money transfers or physical Swish app approval.

## Production rollout result

On 2026-10-13, after explicit approval, the original source hash and release
archive were verified again. The remote TypeScript build exactly matched the
tested release hashes. The original watched source directory was not overwritten.

- Active compiled release: `/root/swish-releases/20261013T165832Z-group`.
- Root-only backup: `/root/swish-backups/20261013T165832Z-group`, including the
  original application, environment and PM2 process state.
- PM2 runs the compiled release with cwd `/root/swish-server`; the group callback
  is configured and saved for restart. `pm2-root.service` remains enabled.
- Health and authentication smoke checks passed. Missing-ID ordinary callbacks
  return 400 before database access. A group read for a fresh nonexistent payment
  reached the production provider and was rejected as `paymentMismatch`, as
  expected; it did not create a payment.
- A request through the website's ordinary callback proxy reached the protected
  backend and received its validation error. This verifies production URL/secret
  compatibility without exporting Vercel's sensitive environment values.
- Swish MSS delivered three POST callbacks to the production group endpoint at
  17:01:42–17:01:50 UTC. They returned 404 for the deliberately nonexistent group.
  Simulator payment/refund GETs reached PAID. This proves delivery and rejection
  of unknown groups, not a real paid-group lifecycle.
- Read-only Supabase verification confirmed the correct worker URL and enabled
  schedule. Recent cron runs succeeded every minute. Saved worker HTTP replies
  at 07:24, 10:39 and 11:15 UTC were 200 with `processed: 1`, `failed: 0`,
  `notifications: 0`. No groups were due at verification time; no manual worker
  run or notification send was needed.
- Vercel rebuilt existing production commit
  `28cd51332bb8344af5dfc8d3f5e10322246a1267` with `GROUP_SWISH_ENABLED=true`.
  New deployment: `dpl_ASeNY2R4qnknD3EGqY4gy8FMB8EQ`; previous deployment for
  rollback: `dpl_8Mmq54tuQ3hTJX7xdRtRDDDSkm61`.
- The new deployment is READY and owns both public domains. Published ordinary
  checkout and a group page with a synthetic ID both returned HTTP 200 and
  serialized `swish_enabled: true`. No production group was created for this
  check. External Swish health returned 200; PM2 showed zero restarts and matching
  persisted release/callback configuration.
- The shared restaurant switch `business_settings.swish_enabled` was false.
  It was changed to true only after separate explicit approval covering ordinary
  and group checkout. Only this field changed; its prior value was saved locally
  in `/tmp/nordic-swish-settings-backup-20261013.json`.

The existing split-payment creation UI still chooses card when card is enabled;
it does not expose the API's optional payment-method selection. The Swish gateway
supports split shares, but this deployment does not add a new selector or change
existing groups' payment methods. Host-paid groups can select Swish at review.

## Deployment sequence and rollback

1. Obtain approval for the production payment-service restart. Recheck the
   entrypoint hash above and inspect current PM2 state. Abort if the source changed;
   rebase and revalidate the patch rather than overwriting it.
2. Create a root-only timestamped backup of the original source/build, package
   files, `.env`, and PM2 dump. Preserve existing certificates and keys. Record
   hashes; never print `.env`, private keys or PM2 environment contents.
3. Stage a separate release with the patched entrypoint and the three modules.
   Compile with the installed dependencies. Validate hashes before switching.
   Avoid writing individual files into the live `tsx watch` directory.
4. Configure only the new group callback:
   `SWISH_GROUP_CALLBACK_URL=https://www.nordiceatery.se/api/group-orders/swish-callback`.
   Keep the existing production merchant, certificate, secrets, ordinary callback
   and application data. The release must resolve the existing `node_modules`;
   keep cwd `/root/swish-server` so existing relative paths and dotenv still work.
5. Switch only `swish-server` to the compiled release under PM2, check `/health`,
   unauthenticated ordinary/group denial and an authenticated malformed group
   request (400, no payment). Verify actual process script/cwd, save the PM2 state
   only after success, and confirm `pm2-root.service` remains enabled.
6. Keep group Swish disabled until website/backend internal-secret compatibility,
   callback delivery and reconciliation-worker execution are verified. Enabling
   `GROUP_SWISH_ENABLED` on Vercel requires a matching website deployment; changing
   a saved environment variable does not update an already built deployment.
7. If release checks fail, stop only the candidate process and restore its previous
   PM2 entry from the protected backup. Original source remains untouched. Check
   health/ordinary auth again. Do not roll back data or discard payment records.

After accepting any group payments, disabling new group Swish must retain the
group route and worker for in-flight payments/refunds. Never revert to a backend
without group routes while such payments exist.

## Remaining technical debt and risks

The legacy ordinary checkout still needs a separate durable-attempt/idempotency
audit; this patch does not rewrite its upserts or VAT calculation. MSS does not
prove a physical Swish app, real bank approval or public callback delivery. The
group callback/worker orchestration has mock-based service tests, but still needs
deployment-specific operational verification. Existing rate limiting is per
instance. Production source drift remains documented and requires hash checking
for this rollout.
