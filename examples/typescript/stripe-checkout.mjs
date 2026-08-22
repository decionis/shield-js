import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient();
const paymentIntentId = "pi_sandbox_123";
const decision = await shield.authorize(
  {
    amount: 640,
    currency: "EUR",
    purpose: "Confirm hotel checkout",
    merchant: "Harbor Grand",
    agentId: "travel-agent-demo",
    transactionType: "PURCHASE",
    metadata: { paymentIntentId },
  },
  { scenario: "travel-allowance-exceeded" },
);

if (decision.verdict !== "ALLOW") {
  console.log(`${decision.verdict}: Stripe confirmation was not called.`);
  process.exit(0);
}

await confirmStripePayment({
  paymentIntentId,
  metadata: { shieldDecisionId: decision.decisionId },
});

async function confirmStripePayment({ paymentIntentId, metadata }) {
  console.log(`Would confirm ${paymentIntentId} once with`, metadata);
}
