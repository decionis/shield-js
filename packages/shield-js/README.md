# Consumer Spending Authorization for TypeScript

**Decionis Shield SDK** — let your app or AI agent ask the user's Shield before spending their money.

## Install

```bash
npm install @decionis/shield
```

Published on npm as `@decionis/shield`.

## Thirty seconds to a decision

```ts
import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient(); // sandbox by default
const decision = await shield.authorize({
  amount: 89,
  currency: "USD",
  purpose: "Book hotel",
  merchant: "Hilton"
});

if (decision.allowed) await execute();
```

No account or key is required in sandbox. No real money can move.

## Handle all three verdicts

```ts
switch (decision.verdict) {
  case "ALLOW":
    await execute();
    break;
  case "ASK": {
    const final = await shield.requestApproval(decision.decisionId);
    if (final.verdict === "ALLOW") await execute();
    break;
  }
  case "BLOCK":
    await cancel();
}
```

An error is not permission. The SDK fails closed and every `ShieldError` has `safeToExecute: false`.

## Deterministic scenarios

```ts
const decision = await shield.authorize(
  { amount: 267, currency: "EUR", purpose: "Book hotel" },
  { scenario: "travel-approval" }
);
// ASK — hold until approval
```

Run all scenarios with `npx @decionis/shield-demo --all`, or `npm run shield:demo:all` from this repository.

## Production

```bash
DECIONIS_SHIELD_ENV=production
DECIONIS_SHIELD_API_KEY=shield_pk_...
```

```ts
const shield = new ShieldClient({
  environment: "production",
  identity: {
    appId: "app.travel.example",
    displayName: "Example Travel Agent",
    developer: "Example, Inc."
  }
});
```

Production keys belong on servers, never in browsers. Production provisioning is not yet self-service; the client intentionally refuses to run without both a key and integration identity.

## API

- `authorize(request, options?)` → `ShieldDecision`
- `requestApproval(decisionId)` → current `ShieldDecision`
- `getDecision(decisionId)` → current `ShieldDecision`
- `getDossier(dossierId)` → evidence and advanced metadata
- `sandboxScenarios` → deterministic local fixtures

The package is TypeScript-first, ESM, dependency-free at runtime, Node.js 20+, and browser-safe for sandbox use. See the [five-minute quickstart](../../docs/developers/quickstart.md) and [REST contract](../../openapi/shield-api.yaml).

## Enforcement boundary

Applications must request Shield authorization before executing the consequential action. Shield does not universally intercept arbitrary card or bank transactions.

## License

Apache-2.0. Use of the hosted Shield service is governed separately.
