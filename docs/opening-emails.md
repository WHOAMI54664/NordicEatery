# Email-only opening notifications

## Configuration

Production project: Vercel `whoami54664s-projects/nordiceatery111`, branch `main`.
Supabase project: `bspclxildhjnkoniiyos`.
Resend sender: `Nordic Eatery <bokning@nordiceatery.se>` in production `RESEND_FROM_EMAIL`; domain verified. Existing `RESEND_API_KEY` is used.

Apply `supabase-migration-opening-emails.sql`, then `supabase-schedule-opening-emails.sql`. Both were applied successfully on 2026-09-23. The latter creates a dedicated random secret in Supabase Vault and an authorization RPC accessible only to service_role. The secret never needs to leave Supabase. No Vercel CRON_SECRET is needed.

Supabase Cron job `nordic-opening-emails` runs every minute. It invokes `/api/cron/opening-emails` with a Bearer token only when the kitchen is open and queued work is due. Vercel Hobby's daily Cron limit is insufficient for this flow. The worker authenticates using the restricted database RPC, processes up to 20 addresses, and checks kitchen state before each send.

## Behavior

The homepage and menu show the closed-kitchen popup once per browser session/day. Email is required; phone is no longer collected. A request creates one pending notification. Duplicate pending requests share a job. Opening a shift starts a batch with Next.js `after`; Cron drains the rest and retries failures.

Jobs have a five-minute lease and a per-job Resend idempotency key. Jobs with ambiguous delivery older than 23 hours become `failed` for review; they are not automatically retried beyond Resend's 24-hour deduplication window. `sent` means accepted by Resend, not proven inbox delivery. Review Resend delivery/bounce reports separately.

Marketing consent is optional, unchecked initially, stored with timestamp and version `email-news-v1`. Newsletter recipients must satisfy `marketing_consent_at IS NOT NULL AND unsubscribed_at IS NULL`. An opening request without the checkbox does not grant marketing consent. Campaign creation is outside this implementation.

Unsubscribe GET shows a confirmation form so email scanners do not accidentally unsubscribe users. POST removes marketing consent and cancels queued notifications. Mail already in transmission may still arrive.

Legacy `shift_open_notifications` records are preserved, not imported. Three pending legacy requests existed at launch preflight. Do not silently send stale requests or enroll them in marketing. Staff Telegram notifications are no longer used for this form.

## Checks and rollback

Production build, TypeScript and email unit tests passed. Isolated PostgreSQL-compatible SQL tests passed for migration, deduplication, closed-kitchen gating, leases, locale snapshots, unsubscribe and expired retries.

Previous production: deployment `8E2avXu6Tbj9KDraJyz7H53YzEg9`, commit `cc03cd3129251a11f02e776275b40c32b8dd6875`. To stop scheduled processing: `select cron.unschedule('nordic-opening-emails');`. Restore the previous Vercel deployment if needed. Leave the new tables in place to preserve requests and consent records.

Supabase dashboard displayed a quota/grace-period warning, although project status was Healthy. The owner should review billing/quotas; no plan or billing changes were made.
