# Decionis Shield Sandbox

Run deterministic spending-authority scenarios without an account or real money.

```bash
npx @decionis/shield-demo
npx @decionis/shield-demo --all
npx @decionis/shield-demo --scenario subscription-price-increase
npx @decionis/shield-demo serve --port 8787
```

Published on npm as `@decionis/shield-demo`.

The default output explains the requesting agent, proposed action, amount, user permission, ALLOW / ASK / BLOCK verdict, execution instruction, decision ID, and dossier ID. Every output states `Environment: SANDBOX` and `No real money can move.`

The local REST server exposes:

```text
POST http://127.0.0.1:8787/v1/shield/authorize
GET  http://127.0.0.1:8787/health
```

See the [sandbox guide](../../docs/developers/sandbox.md).
