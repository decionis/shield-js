# Shield Developer Experience Audit

Date: 2026-08-22

## Critical

1. **There was no installable Shield developer product.** The Shield repository was a consumer Flutter application plus browser extension. `@decionis/shield` and `@decionis/shield-demo` were not present in npm, and no Shield Swift package existed.
2. **ASK and BLOCK were not distinct at the consumer boundary.** The current Consumer BFF combines local limit failures and engine `REJECT` / `ESCALATE` into `REJECT` plus `requires_biometric`. A public SDK cannot reliably tell a recoverable approval hold from a terminal block without a new adapter response.
3. **Third-party spender identity is not provisioned.** The BFF accepts a consumer session; the Protocol accepts organization-scoped credentials. Neither is the correct credential for an app or agent acting under a user's Shield permission.
4. **The public environment model did not exist.** Internal `SHIELD_DEMO` and release flags are useful for the app but are not a safe SDK contract. Public integrations need exactly `sandbox` and `production`.
5. **The enforcement boundary was easy to overread.** Some consumer copy describes Shield as freezing charges generally. Deterministic blocking exists only where an integrated application, agent, browser surface, or payment executor asks Shield before acting.

## High impact

1. Existing `@decionis/sdk` and Protocol MCP tools expose enterprise nouns (`org_id`, policy bundles, rollout modes) before first success.
2. There was no five-minute Shield quickstart, deterministic multi-scenario sandbox, local REST simulator, or copy-paste ALLOW / ASK / BLOCK handler.
3. Shield was absent from Decionis `llms.txt`, `llms-full.txt`, the main OpenAPI inventory, and the public MCP discovery story.
4. The internal GitHub repositories had minimal descriptions, no topics, and no homepages. There was no public Shield SDK or examples repository. The public Decionis MCP and Presence SDK repositories are stronger discovery precedents.
5. Terminology drifted among `APPROVE / ESCALATE / REJECT / REVIEW`, consumer `ASK / ALLOW / BLOCK`, `blocked + requires_biometric`, and app UI labels. The developer surface needs one vocabulary.
6. Presence already provides a secure approval handoff, but Shield did not give developers a single consumer-facing operation that orchestrates it.

## Nice to have

- Self-serve compatibility validation and a lightweight “Works with Decionis Shield” gallery.
- Developer dashboard views for verdict rates, approval completion, latency, and integration health.
- Framework-specific recipes beyond the initial agent, Stripe, subscription, and Presence examples.
- Automated contract generation for every language after the public adapter stabilizes.
- Certification automation once the compatibility standard has meaningful adoption.

## Existing assets to reuse

- The Consumer BFF owns consumer identity, policies, device registration, push, event history, and dossier lookup.
- Decionis Protocol owns deterministic evaluation, execution grants, signatures, and Decision Dossiers.
- Presence owns intent-bound human approval and biometric/passkey proof.
- `@decionis/sdk` remains the enterprise execution-authority SDK.
- `decionis_guard` remains a separate on-device data-egress minimization library; it should not be renamed into the spending SDK.
- The existing Protocol MCP server remains the advanced enterprise surface. Shield should add five consumer aliases, not fork the MCP runtime.

## Smallest coherent architecture

```text
App / AI agent / checkout
        │
        │  Shield SDK, REST, or consumer MCP
        ▼
Shield developer adapter (inside the existing Consumer BFF)
        │
        ├── resolve registered spender identity + user permission
        ├── translate Protocol outcomes to ALLOW / ASK / BLOCK
        ├── ASK → Presence approval handoff
        └── attach Decision Dossier reference
        ▼
Decionis Protocol + existing evidence / grant services
```

The adapter is a route boundary, not a new service or policy engine. Its prerequisite is a user-issued integration credential bound to `app_id`, optional `agent_id`, and the user's Shield account. Until that exists, production SDK configuration is intentionally fail-closed; the local sandbox is fully runnable and clearly labelled.

## Delivery order

### P0 — activation

- Canonical ALLOW / ASK / BLOCK contract and structured errors.
- `@decionis/shield`, ShieldKit, deterministic sandbox CLI, and local REST simulator.
- Five-minute quickstart, developer page, runnable recipes, and machine-readable docs.
- Honest enforcement-boundary copy and cross-links.

### P1 — ecosystem

- BFF developer adapter and integration-identity credential lifecycle.
- Consumer-friendly MCP aliases backed by the same adapter.
- Compatibility runner, “Works with Shield” self-attestation, dashboard metrics, and real Presence approval recipe.

### P2 — distribution

- Publish packages and public SDK mirrors, reserve GitHub names, add topics/homepages.
- Add Shield to Decionis machine discovery and sitemap from canonical contract generation.
- Expand recipes, certification automation, and integration gallery.
