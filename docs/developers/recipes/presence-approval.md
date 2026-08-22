# Require Human Approval with Presence

## Problem

Shield returns ASK because the purchase exceeds the user's automatic limit. The application must hold the action while the user approves on a trusted Presence surface.

## Architecture

```text
Shield ASK → shield.requestApproval(decisionId) → Presence verifies the human
          → Shield re-evaluates the exact action → final ALLOW or BLOCK
```

The Shield SDK hides the Presence session, invitation, signature, and dossier plumbing for the default path.

## Install

```bash
npm install @decionis/shield
```

## Complete minimal code

```ts
const decision = await shield.authorize({
  amount: 267,
  currency: "EUR",
  purpose: "Book hotel in Copenhagen",
  merchant: "Nordhavn Hotel",
  agentId: "travel-agent"
});

if (decision.verdict === "ASK") {
  const final = await shield.requestApproval(decision.decisionId);
  if (final.verdict === "ALLOW") {
    await execute({ shieldDecisionId: final.decisionId });
  }
}
```

## Expected decision

Sandbox returns ASK, then an ALLOW labelled as a simulated Presence fixture. Production may remain ASK while approval is pending, or become BLOCK on denial, expiry, mismatch, or changed policy.

## Test

Test approved, denied, expired, abandoned, action-changed, and duplicate-callback paths. Execute only in the approved, still-current, exact-action case.

## Production considerations

- Presence proves the human approval; Shield remains the spending authority.
- Re-evaluate policy and action binding after approval.
- Do not transfer approval to a different cart, payment target, or amount.
- Store both Shield decision ID and advanced Presence receipt reference when returned.
