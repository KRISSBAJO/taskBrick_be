# TaskBricks billing production setup

This document is the source of truth for production Stripe and Paystack billing setup.

## Provider routing

- USD and other non-NGN plans should use Stripe.
- NGN plans should use Paystack.
- Web and mobile checkout requests send the intended provider explicitly.
- Backend checkout still validates currency/provider compatibility before creating a provider session.

## Required backend environment

```bash
BILLING_ENABLED=true
BILLING_PROVIDER=stripe
FRONTEND_URL=https://app.your-domain.com

STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PORTAL_RETURN_URL=https://app.your-domain.com/settings/billing

PAYSTACK_SECRET_KEY=sk_live_...
PAYSTACK_PUBLIC_KEY=pk_live_...
PAYSTACK_CALLBACK_URL=https://app.your-domain.com/settings/billing
PAYSTACK_PORTAL_URL=
```

`PAYSTACK_CALLBACK_URL` is only a fallback. Checkout requests can override the return URL, which is required for mobile deep links.

## Webhook URLs

Configure provider dashboards to call these backend URLs:

- Stripe: `https://api.your-domain.com/api/v1/billing/webhooks/stripe`
- Paystack: `https://api.your-domain.com/api/v1/billing/webhooks/paystack`

Stripe must send events with the signing secret in `STRIPE_WEBHOOK_SECRET`.
Paystack must sign payloads with the secret configured in `PAYSTACK_SECRET_KEY`.

## Return and reconciliation flow

1. User chooses a plan.
2. Frontend/mobile calls `POST /api/v1/billing/checkout`.
3. Backend creates a Stripe or Paystack checkout session and embeds tenant, plan, seats, provider, and return metadata.
4. Provider redirects back with `checkout=success` plus `session_id` or `reference`.
5. Client calls `POST /api/v1/billing/checkout/confirm`.
6. Backend verifies the provider session/transaction, activates the subscription, writes the invoice, and updates tenant billing status.

Webhooks are still required because users can close the browser before returning to the app.

## Mobile recovery behavior

Mobile stores the pending checkout session id or Paystack reference after checkout starts. If the payment browser does not deep-link back to TaskBricks, the Billing screen shows a manual **Confirm payment** action that calls the same confirmation endpoint.

## Plan change rules

- Paid provider changes should go through checkout.
- Local `change-plan` is reserved for free/manual plan changes and administrative corrections.
- Immediate manual changes record proration details in subscription metadata.
- If a manual upgrade creates a positive prorated amount, the backend creates an open local adjustment invoice.
- Manual downgrades record the calculated credit in metadata; provider credits must still be handled in Stripe/Paystack where applicable.

## Reliability dashboard

Tenant billing pages should show recent provider events from:

```http
GET /api/v1/billing/events
```

Operators should investigate any `FAILED` events first, then long-lived `RECEIVED` events that never move to `PROCESSED` or `IGNORED`.

## Production smoke test

Run this once per deployment environment:

1. Create one USD Stripe plan and one NGN Paystack plan.
2. Complete Stripe checkout from web.
3. Confirm the subscription becomes `ACTIVE` and an invoice is written.
4. Complete Paystack checkout from mobile.
5. Confirm mobile returns or shows **Confirm payment** and the subscription becomes `ACTIVE`.
6. Trigger a failed payment event in each provider sandbox and confirm it appears in billing events.
7. Open the billing portal for Stripe subscriptions.
8. Verify tenant entitlements reflect the active plan.
