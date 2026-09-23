# Email-only opening notifications

Local implementation; production activation needs the steps below.

1. Apply `supabase-migration-opening-emails.sql` in Supabase before deploying.
2. Configure `RESEND_API_KEY` and `RESEND_FROM_EMAIL` using an approved sender on a verified Resend domain. No fallback to the Resend test domain is used.
3. Configure a random `CRON_SECRET`. Arrange an authenticated GET to `/api/cron/opening-emails` every minute (Authorization: Bearer <CRON_SECRET>) with your existing scheduler. No scheduler has been provisioned by this change. Each run processes up to 20 addresses; rate/capacity must match the Resend plan.
4. Deploy, then test with an address controlled by the business: subscribe while closed, open a real shift at its actual opening time, verify the email, repeat the worker and check that no duplicate arrives, and test unsubscribe. Do not open production just for testing.

Opening a shift starts a batch with Next.js `after`. The scheduler drains remaining batches and retries failures. Jobs are claimed with a five-minute lease and sent with a per-job Resend idempotency key. Ambiguous jobs older than 23 hours are marked failed for review, preventing retries after Resend's 24-hour deduplication window. `sent` means accepted by Resend, not proven inbox delivery. Check Resend delivery/bounce reports separately.

The popup appears on the homepage and menu once per session/day. Email is required; telephone numbers are no longer collected. Duplicate pending subscriptions share one job. A new request after a completed send creates a new one-time notification.

Marketing consent is optional, unchecked initially, and saved with its timestamp and version `email-news-v1` in `opening_email_contacts`. Newsletter tooling must only use rows with `marketing_consent_at IS NOT NULL AND unsubscribed_at IS NULL`. An opening request without the checkbox does not grant marketing consent. This change collects consent; it does not build a campaign editor or send marketing campaigns.

Unsubscribe links show a confirmation form (GET is safe for email scanners). POST removes marketing consent and cancels pending opening emails. An email already in transmission may still arrive.

Legacy `shift_open_notifications` records are preserved and not auto-imported: old phone requests and stale email requests are not silently sent or enrolled in marketing. Review old pending requests separately before migration. Staff Telegram notifications have been removed from the new flow.

Public request throttling uses the project's existing in-memory limiter. For production abuse controls across serverless instances, configure a shared limit or edge rate limiting. No real emails were sent during local verification.

## Launch verification, 2026-09-23

- Resend API: nordiceatery.se is verified. Existing receipt sender: bokning@nordiceatery.se.
- Production project: Vercel `whoami54664s-projects/nordiceatery111`, branch `main`.
- Previous production deployment: `8E2avXu6Tbj9KDraJyz7H53YzEg9`, commit `cc03cd3129251a11f02e776275b40c32b8dd6875` (rollback reference).
- Production build succeeded in an isolated directory. TypeScript and email unit tests passed.
- SQL verified in an isolated PGlite/PostgreSQL engine: migration, pending deduplication, closed-kitchen gating, claims and leases, locale snapshot, unsubscribe cancellation and expiry of ambiguous retries.
- Use Supabase Cron with `supabase-schedule-opening-emails.sql`; Vercel Hobby's daily schedule is insufficient. Store the dedicated CRON_SECRET in Vault under `nordic_opening_email_cron_secret` before scheduling. The schedule only invokes the API when the kitchen is open and jobs are due.
- Local `.env.local` now has RESEND_FROM_EMAIL and a dedicated CRON_SECRET. Their values are not committed.
- Vercel production RESEND_FROM_EMAIL was saved and read back by variable name. Dedicated CRON_SECRET import is still pending (Chrome extension file upload was unavailable).
- Remote main was fast-forwarded to the current production commit; remote changes were README-only and preserved.
- Supabase dashboard requires sign-in. Production database migration, Vault setup, cron scheduling, deployment and live delivery verification have not yet been performed.
