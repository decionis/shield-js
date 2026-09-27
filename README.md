# Decionis Shield

**Consumer spending authority for apps and AI agents.**

> Your app wants to spend. Shield decides whether it has permission.

Decionis Shield is the consumer-facing spending-authority surface of Decionis. An
integrated app, checkout, or AI agent asks before it acts and receives one stable
verdict: **ALLOW**, **ASK**, or **BLOCK**.

Applications must request Shield authorization **before** executing the
consequential action. Shield can deterministically block Shield-integrated
execution; observed card, bank, or browser activity is not equivalent to an
enforcement point.

[Developer quickstart](docs/developers/quickstart.md) ·
[JavaScript SDK](packages/shield-js/README.md) ·
[ShieldKit for Swift](https://github.com/decionis/shield-swift) ·
[REST contract](openapi/shield-api.yaml) ·
[App Store](https://apps.apple.com/us/app/decionis-shield/id6787201626)

## First decision in five minutes

ShieldKit and the npm packages are public. Run the deterministic sandbox locally—
no account, credentials, or real money required:

```bash
npm install @decionis/shield
npx @decionis/shield-demo --all
```

Minimal TypeScript:

```ts
import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient(); // sandbox is the safe default
const decision = await shield.authorize({
  amount: 89,
  currency: "USD",
  purpose: "Book hotel",
  merchant: "Hilton"
});

if (decision.verdict === "ALLOW") await execute();
if (decision.verdict === "ASK") await shield.requestApproval(decision.decisionId);
if (decision.verdict === "BLOCK") await cancel();
```

The same canonical contract drives TypeScript, Swift, REST, the CLI sandbox, MCP
schemas, examples, and compatibility tests. See the
[DevEx audit](docs/developer-experience-audit.md) for current production gaps and
the smallest architecture that closes them without another policy service.

## Product hierarchy

| Need | Integrate |
|---|---|
| Enterprise execution authority | **Decionis Protocol** |
| Human or biometric approval | **Presence** |
| Consumer/app/agent spending authority | **Shield** |

---

## What is in this repository

| Path | What it is |
|---|---|
| [`packages/shield-js`](packages/shield-js/README.md) | `@decionis/shield`, the TypeScript SDK. |
| [`packages/shield-demo`](packages/shield-demo/README.md) | `@decionis/shield-demo`, deterministic sandbox scenarios on the command line and a local REST server. |
| [`packages/shield-compat`](packages/shield-compat/README.md) | `shield-compat`, the compatibility suite: checks that your integration asks before it spends and respects each verdict. |
| [`contracts/`](contracts) | JSON Schemas for a request and a decision, and the MCP tool definitions. |
| [`openapi/shield-api.yaml`](openapi/shield-api.yaml) | The REST contract. |
| [`examples/`](examples/README.md) | An AI travel agent, a subscription renewal and a Stripe checkout, each run against the sandbox. |
| [`docs/developers/`](docs/developers/quickstart.md) | Quickstart, sandbox, errors, MCP, metrics, production readiness and recipes. |
| [`llms.txt`](llms.txt) | The same material, for agents. |

## Develop

Node 20 or later.

```bash
npm install
npm test                  # the contract tests, then each package's tests
npm run shield:demo:all   # build, then run every sandbox scenario
```

## The Shield app

[Decionis Shield on the App Store](https://apps.apple.com/us/app/decionis-shield/id6787201626)
is the consumer app built on this contract: it is where your users set the
spending permission Shield evaluates. Its source is not in this repository.

## License

Apache-2.0: see [LICENSE](LICENSE) and [NOTICE](NOTICE). Use of the hosted
Shield service is governed separately.
