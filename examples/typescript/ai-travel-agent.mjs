import { ShieldClient } from "@decionis/shield";

const shield = new ShieldClient();
let decision = await shield.authorize(
  {
    amount: 267,
    currency: "EUR",
    purpose: "Book hotel in Copenhagen",
    merchant: "Nordhavn Hotel",
    category: "travel",
    agentId: "travel-agent-demo",
    transactionType: "PURCHASE",
  },
  { scenario: "travel-approval" },
);

console.log(`${decision.verdict}: ${decision.reason}`);
if (decision.verdict === "ASK") {
  console.log("Holding the booking while Shield requests user approval.");
  decision = await shield.requestApproval(decision.decisionId);
}

if (decision.verdict === "ALLOW") {
  await bookHotel({ decisionId: decision.decisionId });
} else {
  console.log("Booking cancelled. No purchase executed.");
}

async function bookHotel({ decisionId }) {
  console.log(`Hotel booked once with Shield decision ${decisionId}.`);
}
