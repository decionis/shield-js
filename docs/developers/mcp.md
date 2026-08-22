# Shield MCP Developer Experience

Shield should add five consumer-facing tools to the existing Decionis MCP runtime:

```text
shield.request_purchase
shield.check_spending_authority
shield.get_permission
shield.request_approval
shield.get_decision
```

Their machine-readable inventory is [shield-mcp-tools.json](../../contracts/shield-mcp-tools.json).

## Example

```text
User: Book a hotel under €300.
Agent: Found one for €267.
Shield: ASK
Reason: Travel purchases above €200 require approval.
Agent: Holding the booking. I will not purchase until Shield returns ALLOW.
```

## Implementation rule

These are aliases over the Shield developer adapter, not a new MCP server. They must not require a first-time consumer developer to send `org_id`, choose rollout modes, inspect policy graphs, or call low-level dossier primitives.

Presence handles human approval behind `shield.request_approval`. A completed Presence check is fed back through Shield so the agent proceeds only on a final `ALLOW` bound to the same action.

## Tool safety instructions

- ALLOW: execute only the exact action once and retain `decisionId`.
- ASK: hold and request approval; never interpret it as a soft allow.
- BLOCK: stop.
- Tool error: hold. Errors are not authorization.
