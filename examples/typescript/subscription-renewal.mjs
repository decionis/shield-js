import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient();
const decision = await shield.authorize(
  {
    amount: 99,
    currency: "USD",
    purpose: "Renew analytics subscription",
    merchant: "Metric Cloud",
    transactionType: "RENEWAL",
    metadata: { previousAmount: 49 },
  },
  { scenario: "subscription-price-increase" },
);

if (decision.verdict === "ALLOW") {
  await renew({ decisionId: decision.decisionId });
} else if (decision.verdict === "ASK") {
  console.log(`Renewal held: ${decision.reason}`);
} else {
  console.log(`Renewal stopped: ${decision.reason}`);
}

async function renew({ decisionId }) {
  console.log(`Subscription renewed with Shield decision ${decisionId}.`);
}
