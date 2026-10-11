# Nordic Eatery

Polish street-food ordering site built with Next.js, TypeScript, next-intl and
Supabase. Stripe checkout and a separate Express Swish backend handle payments.

## Development

```sh
npm ci
npm run dev
```

Use isolated development credentials in `.env.local`; a local or Preview website
must not inherit production payment/email/service-role access for mutation tests.
Open `http://localhost:3000`. Run only one Next.js process against the `.next` cache;
stop the development server before running a production build.

## Checks

```sh
npm test
npm run lint
npm run typecheck
npm run typecheck:swish
npm run build
```

The test suite uses mocks and PGlite without loading production environment files.
The Swish service is excluded from the website tsconfig and checked separately.

## Menu and ordering

- `/{locale}/menu`: image categories, dietary filters and product configuration.
- `/{locale}/admin/menu`: category titles and images (owner/admin).
- `/{locale}/admin/products`: products, required choices, surcharges and stock.
- `/{locale}/group-order`: invitations, individual selections and host/split payment.

Read [menu architecture and rollout](docs/menu-architecture.md),
[group-order operations](docs/group-orders.md) and
[opening notifications](docs/opening-emails.md) before deployment.
Apply the additive menu-options migration before deploying option-aware checkout.
