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

## Consumer app

The published Flutter app gives consumers a Security Profile for their money and
connects to the existing Consumer BFF, which reuses Decionis decision, dossier,
and execution-grant services rather than duplicating them.

> Companion backend: **decionis/Decionis** — the Consumer BFF (`apps/api/src/routes/consumer.ts`).

---

## What it does

| Capability | Consumer value |
|---|---|
| **Circuit-breaker home** | A physical-feeling GATE ACTIVE / KILL SWITCH that visibly trips on a blocked charge, with a live micro-ledger of transactions passing through. |
| **3-toggle policy** | "Block single purchases over $100", "Freeze recurring renewals over $25", "Cap AI/agent spend at $50/week" — no code, no dashboards. |
| **Simulated Attack** | A safe, local rogue-charge that runs the *real* gate end-to-end (push + biometric + dossier) so value is felt in <120s. |
| **AI Allowance Gate** | A rogue agent checkout → gate → FaceID → a single-use, cart-bound execution grant the agent can redeem exactly once. |
| **Dispute Passport** | A cryptographically-signed, shareable proof of exactly which boundary failed — verified on-device against the engine's Ed25519 JWKS. |
| **Secure Gateway** *(preview)* | An on-device network filter (iOS Network Extension / Android VpnService) meant to freeze outbound checkouts before the money leaves. **Disabled by default** (`SHIELD_GATEWAY`) until the native packet-verdict loop ships — the UI reads "coming soon". |
| **Viral Simulation Test** | A shareable web page that shows a friend a blocked $95 withdrawal on their own screen. |

---

## Architecture

```
┌──────────────── Decionis Shield (this repo, Flutter) ───────────────┐
│  screens/      circuit breaker · onboarding · agent · passport ·     │
│                gateway · sign-in                                     │
│  controllers/  simulation · agent                                    │
│  services/     client (typed BFF client) · session (keychain) ·      │
│                biometric · push (+ FCM) · secure_gateway · verifier  │
└───────────────────────────────┬─────────────────────────────────────┘
                                 │ HTTPS (consumer contract)
                                 ▼
┌──────────────── Consumer BFF (Decionis/apps/api) ───────────────────┐
│  consumer auth · 3 toggles ↔ policy bundle · evaluate proxy ·        │
│  enforce-and-bind · dispute passport · push dispatch · sim page      │
└───────────────────────────────┬─────────────────────────────────────┘
                                 │ internal, org-scoped
                                 ▼
        Decionis engine — decision graph · Proof-of-Action ledger ·
        Ed25519 dossiers · execution grants  (unchanged)
```

The BFF exists because the core engine is enterprise/org-scoped; a consumer must
never hold those credentials. "Reuse" therefore means a **shared HTTP contract**
([docs/consumer-bff-contract.md](docs/consumer-bff-contract.md)) and the engine's
real brains — not shared code. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md)
for the full design and milestone history.

---

## Project layout

```
lib/
  main.dart            app bootstrap, auth lifecycle, push routing
  theme.dart           neon circuit-breaker palette
  models/              evaluate · passport · policy   (wire contract)
  services/            client · http_client · session · secure_store ·
                       biometric · passport_verifier · push · push_fcm ·
                       secure_gateway · config
  controllers/         simulation · agent
  screens/             onboarding · home · agent · passport · sign_in · gateway
  widgets/             micro_ledger
ios/SecureGateway/     Network Extension content filter + setup
android/.../SecureGatewayVpnService.kt   VpnService
docs/                  contract · push-setup · secure-gateway
```

---

## Getting started

```bash
flutter pub get
flutter test          # unit + widget tests
flutter analyze
flutter run            # runs against the live Consumer BFF by default
```

### Run modes (`--dart-define`)

| Flag | Effect |
|---|---|
| *(none)* | **Live** — talks to the Consumer BFF at `SHIELD_BASE_URL`. This is the production default; the mock never ships. |
| `SHIELD_DEMO=true` | **Offline mock** — full flow against `MockDecionisClient`; no backend needed (demos, screenshots). |
| `SHIELD_BASE_URL=...` | BFF base URL (default `https://api.decionis.com`; override with `localhost` or `10.0.2.2` for local development). |
| `SHIELD_FCM=true` | Use real FCM/APNs transport (needs a Firebase project — see [docs/push-setup.md](docs/push-setup.md)). |
| `SHIELD_GATEWAY=false` | Kill-switch to hide the Secure Gateway (on by default; Android ships the real DNS filter). |
| `SHIELD_BILLING=true` | Use native store billing (StoreKit / Play Billing via `in_app_purchase`) instead of the demo stub. Required for store builds. No third-party billing key needed — products are configured in the stores and the BFF verifies receipts. |

Example (live against a local BFF on the Android emulator):

```bash
flutter run --dart-define=SHIELD_BASE_URL=http://10.0.2.2:3001
```

Offline demo (no backend):

```bash
flutter run --dart-define=SHIELD_DEMO=true
```

### Store release scripts

Use the guarded store scripts so billing, FCM, and signing checks happen before
an upload:

```bash
tool/release/publish_stores.sh android
tool/release/publish_stores.sh ios
tool/release/publish_stores.sh chrome
tool/release/publish_stores.sh safari
```

The unified script builds locally first and only uploads when `PUBLISH=true` is
set. It also accepts the `mobile`, `extensions`, and `all` groups, and attempts
every selected store before reporting any failures. Mobile builds
use `SHIELD_BILLING=true`, `SHIELD_FCM=true`, and the live Decionis API/share
URLs by default. Android upload uses `fastlane supply` with
`SUPPLY_JSON_KEY`, `FASTLANE_JSON_KEY_FILE`, or `SUPPLY_JSON_KEY_DATA`; iOS
upload uses `xcrun altool` with `APP_STORE_CONNECT_API_KEY_ID` and
`APP_STORE_CONNECT_API_ISSUER_ID`. Chrome uploads use Chrome Web Store API v2.
See [store release automation](docs/store-release-automation.md) for credentials,
targets, and release controls.

---

## Design choices worth knowing

- **Mock-first.** The app is fully demoable offline; the live client is a drop-in
  swap. Tests stay hermetic (mock client + injected fakes for biometric/push/gateway).
- **Fail-closed on money.** Biometric errors keep a charge blocked; the local
  inline gate is the floor even when the engine enforces.
- **Trust is verifiable.** The Dispute Passport's Ed25519 signature is checked
  on-device against the published JWKS (real crypto, proven by verify/tamper tests).
- **Sessions persist** in the OS keychain (`flutter_secure_storage`).

---

## Status

All milestones (M0–M8) have a tested vertical slice. The remaining work is
outside the codebase — credentials (Firebase/APNs), a running protocol service
for end-to-end enforcement, and native entitlements + device testing for the
Secure Gateway. See [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for the
milestone table and open questions for the backend owners.

`flutter analyze` clean · 40 tests green.
