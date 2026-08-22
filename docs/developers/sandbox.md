# Shield Sandbox

The sandbox is local, deterministic, account-free, and incapable of moving real money. Every dossier is labelled `sandbox_fixture` and every ID begins with a sandbox marker.

## Scenarios

| Scenario | Verdict | What it teaches |
|---|---|---|
| `normal-purchase` | ALLOW | Automatic authority within a limit. |
| `purchase-above-limit` | ASK | The action must wait for the user. |
| `subscription-below-threshold` | ALLOW | Expected renewal within permission. |
| `subscription-price-increase` | ASK | Changed commercial terms need approval. |
| `unknown-autonomous-agent` | BLOCK | Unknown spender identity is terminal. |
| `agent-weekly-allowance-exceeded` | BLOCK | Cumulative allowance is enforced. |
| `expired-spending-permission` | BLOCK | Stale authority is not reusable. |
| `travel-approval` | ASK | Presence approval flow. |
| `travel-allowance-exceeded` | BLOCK | A hard user boundary is respected. |

## Commands

```bash
npm run shield:demo
npm run shield:demo:all
node packages/shield-demo/dist/cli.js --scenario subscription-price-increase
node packages/shield-demo/dist/cli.js --all --json
node packages/shield-demo/dist/cli.js serve --port 8787
```

Replaying the same normalized request returns the same sandbox request, decision, and dossier IDs. This makes tests repeatable without pretending that fixtures are production signatures.

## Generic sandbox policy

Without a named scenario, the local simulator uses a small teaching policy:

- up to 100 major currency units → ALLOW;
- above 100 and up to 500 → ASK;
- above 500 → BLOCK;
- unknown agents, expired permissions, or exceeded cumulative allowances → BLOCK;
- a detected subscription price increase → ASK.

These values are examples, not the user's real Shield policy.
