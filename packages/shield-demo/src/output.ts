import type { SandboxScenario, ShieldDecision } from "@decionis/shield";

export function renderScenario(scenario: SandboxScenario, decision: ShieldDecision): string {
  const subject = scenario.request.agentId
    ? `Agent: ${scenario.request.agentId}`
    : `Application: Shield Sandbox`;
  const merchant = scenario.request.merchant ? `\nMerchant: ${scenario.request.merchant}` : "";
  return [
    "Shield Simulator",
    "",
    "Environment: SANDBOX",
    "No real money can move.",
    "",
    `Scenario: ${scenario.title}`,
    subject,
    `Action: ${scenario.request.purpose}${merchant}`,
    `Amount: ${formatMoney(scenario.request.amount, scenario.request.currency)}`,
    "",
    "Permission:",
    scenario.permission,
    "",
    "Decision:",
    decision.verdict,
    "",
    "Reason:",
    decision.reason,
    "",
    "Execution:",
    executionInstruction(decision),
    "",
    "Decision ID:",
    decision.decisionId,
    "",
    "Dossier:",
    decision.dossierId,
  ].join("\n");
}

function executionInstruction(decision: ShieldDecision): string {
  switch (decision.verdict) {
    case "ALLOW":
      return "Authorized. The application may execute this exact action once.";
    case "ASK":
      return "HOLD. Do not execute until Shield reports user approval.";
    case "BLOCK":
      return "STOP. Do not execute the transaction.";
  }
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}
