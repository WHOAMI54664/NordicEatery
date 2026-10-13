# Shift Z reports (website orders)

Closing a shift stores a numbered accounting snapshot in the same PostgreSQL transaction as the shift update. A failed snapshot rolls the close back. Repeated close/open requests preserve the original boundaries. `lib/reports/z-report.ts` calculates display totals in öre; `z-report-pdf.ts` renders A4; `send-z-reports.ts` delivers the attachment through the existing Resend account.

## Scope and amounts

Only SEK website orders with confirmed payment are sales. Finalized group orders are included via their final `orders` row; an individual payment in an unfinished group is not yet a completed sale. Provider refunds must first be recorded in the existing order refund fields. This feature does not reconcile provider balances.

Each paid order is checkpointed once. Later payment confirmations and refund deltas appear on the next shift close, even if their original timestamps are older. Cumulative totals use the captured transactions and survive order deletion. Category amounts allocate the paid total, less fees, proportionally across line amounts in whole öre, including order discounts. VAT uses stored tax amounts/rates; missing historical tax data is marked unavailable rather than invented.

The PDF follows the supplied cash-register layout, but reports website data only. Cash-drawer operations, removed basket items, receipt-copy counts and cash rounding are not tracked and display `-`. Cancellation/unfinished counts cover orders created during the shift. Company details and all sale/refund data are frozen on close. PDFs do not contain customer names or email addresses.

## Deployment order

1. Back up the database/schema. Apply `supabase-migration-shift-z-reports.sql` before the new application. It snapshots a one-time historical baseline and keeps an already open shift's sales for its first report. Existing history does not generate a flood of emails. The migration is rerunnable.
2. Deploy. Existing `RESEND_API_KEY` and verified `RESEND_FROM_EMAIL` are required. PDFKit font metrics are explicitly included in both server routes by `next.config.ts`.
3. Apply `supabase-schedule-z-reports.sql` to the production Supabase project. It requires Vault, pg_cron and pg_net. Check its fixed production hostname before use in another environment. It creates a separate worker-only secret; it does not reuse payment/cron credentials.
4. Enter the recipient in Settings > Contact details > E-post för Z-rapport and press Spara e-post. The address is stored separately in private `z_report_settings`, readable/writable only by owners and admins; public company settings do not contain it. Blank means reports remain saved and pending; filling it later allows those unsent reports to send. The recipient is frozen when already configured at close or on the first claim.
5. With an explicitly approved recipient, verify a controlled shift close, PDF totals and actual email receipt. Local tests do not prove production delivery.

The close route attempts delivery after responding. The scheduler retries even when the kitchen is closed. A two-minute DB lease and a fixed Resend idempotency key prevent parallel sends/retry duplicates. Resend retains keys for 24 hours (https://resend.com/docs/dashboard/emails/idempotency-keys); automatic ambiguous retries stop at 23 hours. Keep the sender and PDF renderer stable while a report is being retried: changing the request body conflicts with an existing provider key.

## Operations and recovery

Private, service-only `shift_z_reports` records `status`, `attempts`, `first_attempt_at`, `sent_at`, and `provider_id`. `sent` means the provider accepted the email, not that it reached the inbox. Monitor failed rows and overdue pending/sending rows, plus cron and provider delivery logs. Errors deliberately omit customer information and provider response bodies.

Do not blindly reset a failed row: check Resend first because the provider may have accepted a timed-out request. After confirming non-delivery, an operator can explicitly arrange recovery. There is no customer-facing resend button in this change.

For application rollback retain report/checkpoint tables and the trigger so financial history remains intact. Disable only the scheduler with `SELECT cron.unschedule('nordic-z-reports');` if email processing must stop. Removing the trigger disables capture and needs a separately planned accounting recovery; do not drop financial history tables.

## Local validation

`node --import tsx --test tests/z-reports.test.ts` exercises calculations, mocked delivery, migration reruns, atomic rollback, late payments/refunds, private access and lease recovery with PGlite. `npx tsx scripts/preview-z-report.ts` generates `output/pdf/nordic-eatery-z-report-example.pdf` with clearly marked example data. It sends no email.
