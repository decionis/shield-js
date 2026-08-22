# Shield Developer Metrics

## North-star metric

**Shield-Compatible Spenders** — active applications and agents that request authority before spending and pass the compatibility contract.

Secondary strategic metric: **Governed consumer transaction value**.

SDK downloads are distribution telemetry, not success.

## Activation funnel

| Step | Event | Success property |
|---|---|---|
| Discover Shield | `shield_developer_page_viewed` | source, query family |
| Read quickstart | `shield_quickstart_started` | SDK surface |
| Install | `shield_sdk_initialized` | version, environment |
| Run sandbox | `shield_sandbox_started` | scenario |
| First ALLOW | `shield_first_decision` | time since quickstart |
| Trigger ASK | `shield_ask_received` | reason code |
| Complete Presence | `shield_approval_completed` | completion latency, terminal state |
| View dossier | `shield_dossier_read` | sandbox vs production |
| Production request | `shield_production_activated` | spender identity |
| Compatibility | `shield_compat_passed` | suite version |

## Core measures

- Time to First Decision, p50 / p90.
- SDK initialization → first authorization conversion.
- Sandbox and quickstart completion.
- Invalid request, auth, environment, timeout, and ASK-handling errors.
- ASK handling correctness and approval completion rate.
- Decision latency by environment and SDK.
- 7-day / 30-day active compatible spenders.
- Active compatible apps and agents.
- Authorization request volume and governed value.

## Privacy

Default SDK logs omit amounts and arbitrary metadata. Metrics should use coarse currency, verdict, reason code, latency, environment, SDK version, and registered spender ID. Never ingest purpose, merchant, or metadata by default.
