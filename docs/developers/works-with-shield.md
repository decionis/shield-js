# Works with Decionis Shield

“Works with Decionis Shield” is a compatibility signal, not a guarantee that Shield intercepts every payment a product can make.

## Minimum requirements

- Identify the registered app and, when applicable, the acting agent.
- Send amount, ISO currency, and a clear user-facing purpose.
- Request authority before the consequential action.
- Execute only on ALLOW.
- Hold on ASK until a later ALLOW for the same action.
- Stop on BLOCK and on SDK/API errors.
- Preserve the decision ID with the downstream action.
- Never reuse sandbox evidence or a decision for a different amount, merchant, payload, or target.

## Lightweight path

1. Run `npx shield-compat` against the integration adapter.
2. Attach the machine-readable result to the integration registration.
3. Self-attest to the checklist during developer preview.
4. Decionis performs a small sample review before adding the verified mark or gallery listing.

No paid audit or lengthy certification is required for the initial program.

## Badge

Self-attested preview badge:

```markdown
[![Works with Decionis Shield](https://img.shields.io/badge/Works%20with-Decionis%20Shield-6D28D9)](https://decionis.com/shield/developers/works-with-shield)
```

[![Works with Decionis Shield](https://img.shields.io/badge/Works%20with-Decionis%20Shield-6D28D9)](https://decionis.com/shield/developers/works-with-shield)

## Badge rules

- Use the badge only after the compatibility suite passes.
- During preview, describe it as “compatible” or “self-attested,” not “certified” or “endorsed.”
- Do not alter verdict behavior, imply universal card interception, or place the badge beside claims Shield cannot enforce.
- Keep a clear-space margin equal to the badge height and a minimum rendered height of 20 px.
- Remove the badge if the integration stops requesting authorization before execution.

## Consumer presentation

```text
Travel Agent
Works with Shield ✓

Last request: €267 hotel booking
Permission: €300 travel allowance
```

The verified status comes from the server-side integration registry, never from caller-supplied metadata.
