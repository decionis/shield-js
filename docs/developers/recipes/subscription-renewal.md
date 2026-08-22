# Protect Subscription Renewals with Shield

## Problem

A service may renew an expected subscription automatically, but a changed price needs the user's approval before capture.

## Architecture

```text
Renewal scheduler → Shield authorize → ALLOW → capture renewal
                                  └── ASK / BLOCK → hold or cancel
```

The billing capture call is the enforcement boundary.

## Install

```bash
npm install @decionis/shield
```

## Complete minimal code

```ts
import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient();
const decision = await shield.authorize(
  {
    amount: 99,
    currency: "USD",
    purpose: "Renew analytics subscription",
    merchant: "Metric Cloud",
    transactionType: "RENEWAL",
    metadata: { previousAmount: 49 }
  },
  { scenario: "subscription-price-increase" }
);

if (decision.verdict === "ALLOW") {
  await billing.capture({ shieldDecisionId: decision.decisionId });
} else if (decision.verdict === "ASK") {
  await queueApproval(decision.decisionId);
} else {
  await cancelRenewal();
}
```

Runnable file: [subscription-renewal.mjs](../../../examples/typescript/subscription-renewal.mjs).

## Expected decision

```text
ASK: The renewal price is higher than the amount the user previously authorized.
```

## Test

Run `node examples/typescript/subscription-renewal.mjs`. Verify the capture function does not run on ASK.

## Production considerations

- Send the full current amount rather than a computed delta.
- Keep merchant and subscription identity stable.
- Reauthorize any tax, tier, cadence, or price change.
- Make capture idempotent and store the decision ID with the invoice.
