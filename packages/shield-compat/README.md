# Shield Compatibility Test Suite

Verify that an integration requests authority before spending and correctly respects ALLOW, ASK, BLOCK, expired permission, required context, and decision evidence.

```bash
npx shield-compat ./shield.compat.mjs
```

Published on npm as `shield-compat`.

Create `shield.compat.mjs`:

```js
export async function attempt({ request, shield, execute }) {
  let decision = await shield.authorize(request);
  if (decision.verdict === "ASK") {
    decision = await shield.requestApproval(decision.decisionId);
  }
  if (decision.verdict === "ALLOW") {
    await execute({ request, decisionId: decision.decisionId });
  }
}
```

The suite uses injected sandbox authority and execution callbacks, so it can observe ordering without moving money. A passing report is the technical prerequisite for the preview “Works with Decionis Shield” self-attestation.
