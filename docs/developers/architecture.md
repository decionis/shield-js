# Shield Developer Architecture

## Pick the right Decionis product

> **Enterprise execution authority → Decionis Protocol**

> **Human approval → Presence**

> **Consumer, app, or agent spending authority → Shield**

Consumer developers start with Shield. They do not need to model policy graphs, sign dossiers, or orchestrate Presence themselves.

## The developer abstraction

```text
Request spending authority
        ↓
Shield evaluates the user's permission
        ↓
ALLOW / ASK / BLOCK
        ↓
Execute only after ALLOW
```

## Verdict contract

| Verdict | Meaning | Required application behavior |
|---|---|---|
| `ALLOW` | This exact action is authorized now. | Execute it once and preserve the decision ID. |
| `ASK` | The user must approve. | Hold. Start or wait for approval. Execute only after a later `ALLOW`. |
| `BLOCK` | The action is not authorized. | Cancel. Do not retry unchanged. |
| Error | No reliable decision exists. | Hold. An error is never permission. |

## Enforcement boundary

Applications must request Shield authorization **before** executing the consequential action.

- **Shield-integrated execution**: the caller waits for ALLOW. Shield can deterministically prevent that integrated action.
- **Shield-observed activity**: Shield can explain or warn, but it does not control an execution boundary.
- **Sandbox simulation**: deterministic fixtures that never move money and never create production authority.

Do not claim that Shield universally intercepts arbitrary card or bank transactions. The enforcement point belongs in the application, agent tool, checkout service, or executor that can actually withhold the action.

## Internal translation

The developer contract deliberately does not expose Decionis Protocol outcomes. The production adapter owns the translation and preserves advanced data under `decision.advanced`:

| Protocol / approval state | Shield verdict |
|---|---|
| `APPROVE` with valid current authority | `ALLOW` |
| `ESCALATE`, `REVIEW`, or explicit user threshold | `ASK` |
| `REJECT`, expired authority, unknown identity, denied approval | `BLOCK` |

The current Consumer BFF must stop collapsing escalation and rejection before this adapter can ship in production.

## Integration identity

Every production request resolves a registered identity:

```text
app_id · agent_id · display_name · developer · icon · verified status
```

The SDK sends `X-Shield-App-Id`; Shield resolves trusted display metadata server-side. Caller-supplied display names are never treated as verified identity. The consumer should see who wants to spend, what they want to buy, how much, and which permission applies.
