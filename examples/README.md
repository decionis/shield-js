# Shield Integration Examples

Every example requests authority before executing, handles all three verdicts, preserves the decision ID, and runs against the local sandbox.

```bash
npm install
npm run build:developer
node examples/typescript/ai-travel-agent.mjs
node examples/typescript/subscription-renewal.mjs
node examples/typescript/stripe-checkout.mjs
```

Production considerations and expected decisions are documented in [the recipe index](../docs/developers/recipes/README.md).
