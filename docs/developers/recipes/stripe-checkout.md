# Govern Stripe Checkout with Shield

## Problem

An application has created a Stripe PaymentIntent but must ask the user's Shield before confirming it.

## Architecture

```text
Create PaymentIntent (manual confirmation)
        ↓
Shield authorize exact amount and intent
        ↓
ALLOW → confirm once · ASK → hold · BLOCK/error → cancel or leave unconfirmed
```

Stripe confirmation is the enforcement boundary. Creating an unconfirmed intent is not the money-moving action.

## Install

```bash
npm install @decionis/shield stripe
```

## Complete minimal code

```ts
import Stripe from "stripe";
import { ShieldClient } from "@decionis/shield";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const shield = new ShieldClient({
  environment: "production",
  identity: { appId: "app.checkout.example", displayName: "Example Checkout" }
});

const intent = await stripe.paymentIntents.create({
  amount: 64000,
  currency: "eur",
  confirmation_method: "manual",
  confirm: false
});

const decision = await shield.authorize({
  amount: 640,
  currency: "EUR",
  purpose: "Confirm hotel checkout",
  merchant: "Harbor Grand",
  transactionType: "PURCHASE",
  metadata: { paymentIntentId: intent.id }
});

if (decision.verdict === "ALLOW") {
  await stripe.paymentIntents.confirm(intent.id, {
    payment_method: "pm_...",
    metadata: { shield_decision_id: decision.decisionId }
  });
}
```

Runnable sandbox analogue: [stripe-checkout.mjs](../../../examples/typescript/stripe-checkout.mjs).

## Expected decision

The bundled hard-limit scenario returns BLOCK and never calls confirmation.

## Test

Use Stripe test mode plus Shield sandbox. Assert the PaymentIntent remains `requires_confirmation` on ASK, BLOCK, timeout, invalid response, and authentication failure.

## Production considerations

- Use Stripe idempotency keys and retain the Shield decision ID.
- Bind authority to the intent ID, amount, currency, merchant, and final cart.
- Reauthorize before confirming if Stripe recalculates the amount.
- Do not put a Shield production key in client-side Stripe.js code.
