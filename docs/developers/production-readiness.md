# Production Readiness

## Required before production activation

- Registered `app_id` with a user-visible display name, developer, icon, and verification state.
- User-bound integration permission issued from Shield; never an enterprise org key in a consumer binary.
- A real pre-execution enforcement point owned by the integrating application or executor.
- ASK path wired to Presence and tested through approved, denied, expired, and abandoned states.
- Decision ID stored beside the downstream transaction or action record.
- Idempotency and single-execution behavior verified.
- Logs scrubbed of unnecessary consumer metadata.
- Compatibility suite passing.

## Configuration

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

API keys belong on trusted servers only. Browser and mobile integrations should receive a short-lived user-scoped handoff token from their own backend. The self-serve production credential lifecycle remains a P1 backend prerequisite; the SDK intentionally fails closed until it is configured.

## Execution invariant

```text
No ALLOW for this exact action → no execution.
```

An old decision, dossier alone, sandbox decision, observed charge, or completed Presence check does not independently authorize a new action. The production executor must bind the current decision to the exact intent and consume it once.
