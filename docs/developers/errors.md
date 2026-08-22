# Shield Error Design

ASK and BLOCK are decisions, not exceptions. Exceptions mean Shield could not return or process a reliable decision, so execution remains unsafe.

Every `ShieldError` includes:

- `code` — stable machine identifier;
- `message` — what happened;
- `safeToExecute: false` — explicit enforcement instruction;
- `action` — what the developer should do next;
- `retryable` — whether an unchanged retry can be appropriate;
- `status` — HTTP status when available.

## Stable codes

| Code | Retry? | Developer action |
|---|---:|---|
| `SHIELD_INVALID_REQUEST` | No | Correct the named field. |
| `SHIELD_INVALID_STATE` | No | Follow the current verdict; do not request approval for ALLOW or BLOCK. |
| `SHIELD_PRODUCTION_KEY_REQUIRED` | No | Configure a server-side production key. |
| `SHIELD_INTEGRATION_IDENTITY_REQUIRED` | No | Register and configure the spender identity. |
| `SHIELD_BROWSER_CREDENTIAL_UNSAFE` | No | Move the API key to a trusted server. |
| `SHIELD_AUTHENTICATION_FAILED` | No | Check credential and app identity. |
| `SHIELD_RATE_LIMITED` | Yes | Back off and preserve request context. |
| `SHIELD_TIMEOUT` | Yes | Keep the action on hold and retry. |
| `SHIELD_UNAVAILABLE` | Sometimes | Keep the action on hold; retry only if flagged. |
| `SHIELD_ENVIRONMENT_MISMATCH` | No | Do not mix sandbox and production. |
| `SHIELD_INVALID_RESPONSE` | No | Hold and report the request trace. |

Example:

```text
SHIELD_APPROVAL_REQUIRED is not thrown.

The SDK returns verdict: ASK.
Do not execute the transaction yet.
Next: request approval and wait for a later ALLOW.
```

An SDK must never turn a network failure, malformed response, timeout, or unknown verdict into ALLOW.
