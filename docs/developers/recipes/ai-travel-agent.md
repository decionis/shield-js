# Give an AI Travel Agent a €500 Allowance

## Problem

A travel agent can search freely but must not book above the user's allowance. Purchases above €200 require approval; purchases above €500 are blocked.

## Architecture

```text
Agent finds hotel → Shield authorize → ALLOW / ASK / BLOCK → booking executor
                                        ASK → Presence → final ALLOW or BLOCK
```

The booking API is the enforcement boundary. The agent never calls it before ALLOW.

## Install

```bash
npm install @decionis/shield
```

## Complete minimal code

```ts
import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient();
let decision = await shield.authorize(
  {
    amount: 267,
    currency: "EUR",
    purpose: "Book hotel in Copenhagen",
    merchant: "Nordhavn Hotel",
    category: "travel",
    agentId: "travel-agent-demo",
    transactionType: "PURCHASE"
  },
  { scenario: "travel-approval" }
);

if (decision.verdict === "ASK") {
  decision = await shield.requestApproval(decision.decisionId);
}

if (decision.verdict === "ALLOW") {
  await hotel.book({ shieldDecisionId: decision.decisionId });
}
```

Runnable file: [ai-travel-agent.mjs](../../../examples/typescript/ai-travel-agent.mjs).

## Expected decision

```text
ASK: Travel purchases above €200 require user approval.
ALLOW after simulated approval.
```

## Test

```bash
npm run build:developer
node examples/typescript/ai-travel-agent.mjs
```

Change the scenario to `travel-allowance-exceeded`; the booking function must not run.

## Production considerations

- Register both the travel application and stable agent ID.
- Bind the final ALLOW to hotel, dates, total amount, currency, and booking payload.
- Reauthorize if price, dates, merchant, taxes, or payload change.
- Preserve `decisionId` on the booking record.
- Do not treat a completed Presence check alone as booking authority; wait for final Shield ALLOW.
