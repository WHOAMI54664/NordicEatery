# Payment receipts

Paid orders can download the same PDF receipt shown in the confirmation design or
request it by email. The ordinary checkout confirmation remains compact; name,
phone, payment and pickup choices stay visible, while loyalty details, notes and
the itemized cart can be expanded when needed. Group checkout keeps its existing
payment and fulfillment fields and hides optional contact details under one
disclosure.

## Access and delivery

- Card receipts require a paid database order and a matching, paid Stripe Checkout
  Session, PaymentIntent and captured, non-refunded charge. The session ID is the
  capability passed from the Stripe return URL; the order number alone cannot
  retrieve a card receipt.
- Swish receipts use the existing UUID order number and are available only after
  the database marks the order paid. Daily display numbers are not accepted as
  authorization tokens.
- Group receipts require the member's HttpOnly group cookie and a paid card share.
  Split-payment members receive only their own lines; the organizer who paid the
  full group receives the full order. The share amount is checked against the
  stored line snapshots and Stripe payment before rendering.
- Email is sent only after the customer submits an address. Configure `RESEND_API_KEY`
  and either `RECEIPT_FROM_EMAIL` or the existing `RESEND_FROM_EMAIL`. No email
  address is changed on the order. The attached PDF is the same generated receipt
  as the download.
- PDF details come from the saved order and payment snapshots. Pickup location is
  recorded when a new card order is created so later food-truck moves do not alter
  an old receipt. Legacy rows without a saved location use a neutral instruction
  to check the order confirmation.

Receipt responses are private and non-cacheable, rate limited with the existing
per-process limiter, and use a fixed Resend endpoint with bounded network timeouts.
No payment data is changed by the receipt routes.

## Validation

`tests/receipts.test.ts` covers Stripe/order binding, paid and refunded states,
member-specific group shares, deterministic PDF output, email idempotency, invalid
input and the absence of customer-record mutation. Browser checks should use
mocked payment and mail responses; no live charge or email is needed to validate
the interface.
