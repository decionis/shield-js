# 5 Minutes to Your First Shield Decision

## Goal

Receive ALLOW, ASK, and BLOCK locally without an account or real money.

## 1. Install

```bash
npm install @decionis/shield
```

## 2. Request authority

```ts
import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient(); // sandbox is the safe default
const decision = await shield.authorize({
  amount: 89,
  currency: "USD",
  purpose: "Book hotel",
  merchant: "Hilton",
  category: "travel",
  agentId: "travel-agent"
});

switch (decision.verdict) {
  case "ALLOW":
    await execute();
    break;
  case "ASK": {
    const approved = await shield.requestApproval(decision.decisionId);
    if (approved.verdict === "ALLOW") await execute();
    break;
  }
  case "BLOCK":
    await cancel();
}
```

## 3. Trigger each verdict

```ts
const allow = await shield.authorize(
  { amount: 9, currency: "USD", purpose: "Buy supplies" },
  { scenario: "normal-purchase" }
);

const ask = await shield.authorize(
  { amount: 267, currency: "EUR", purpose: "Book hotel" },
  { scenario: "travel-approval" }
);

const block = await shield.authorize(
  { amount: 640, currency: "EUR", purpose: "Book hotel" },
  { scenario: "travel-allowance-exceeded" }
);
```

Expected output:

```text
ALLOW
ASK
BLOCK
```

## 4. Inspect the evidence

```ts
const dossier = await shield.getDossier(block.dossierId);
console.log(dossier.evidenceClass); // sandbox_fixture
console.log(dossier.verdict);       // BLOCK
```

## 5. Run the visual CLI

After publication:

```bash
npx @decionis/shield-demo --all
```

In this repository:

```bash
npm run shield:demo:all
```

## REST quickstart

Start the local sandbox API:

```bash
node packages/shield-demo/dist/cli.js serve
```

Then send the same request over HTTP:

```bash
curl http://127.0.0.1:8787/v1/shield/authorize \
  -H 'content-type: application/json' \
  -H 'x-shield-scenario: travel-approval' \
  -d '{
    "amount": 267,
    "currency": "EUR",
    "purpose": "Book hotel",
    "merchant": "Nordhavn Hotel",
    "agentId": "travel-agent-demo"
  }'
```

## Swift quickstart

See [ShieldKit](../../ShieldKit/README.md). It uses the same sandbox scenarios and verdict handling.

## Error rule

If Shield throws or cannot be reached, **do not execute**. `ShieldError.safeToExecute` is always false and every error includes a next action and retry guidance.

## Move to production

Production requires a registered spender identity and a user-bound integration credential. Those provisioning endpoints are not yet self-service. Do not embed a production key in browser or mobile binaries. See [production readiness](production-readiness.md).
