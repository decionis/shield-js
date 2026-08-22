import type {
  SandboxScenario,
  SandboxScenarioId,
  ShieldDecision,
  ShieldDossier,
  SpendingRequest,
} from "./types.js";

export const sandboxScenarios: readonly SandboxScenario[] = [
  {
    id: "normal-purchase",
    title: "Normal purchase",
    request: {
      amount: 9,
      currency: "USD",
      purpose: "Buy office supplies",
      merchant: "Paper & Co",
      transactionType: "PURCHASE",
    },
    permission: "Automatic purchases up to $100",
    verdict: "ALLOW",
    reason: "This purchase is within the user's automatic spending authority.",
    reasonCode: "WITHIN_SPENDING_AUTHORITY",
  },
  {
    id: "purchase-above-limit",
    title: "Purchase above automatic limit",
    request: {
      amount: 120,
      currency: "USD",
      purpose: "Buy a monitor",
      merchant: "Display Supply",
      transactionType: "PURCHASE",
    },
    permission: "Automatic purchases up to $100; ask up to $500",
    verdict: "ASK",
    reason: "This purchase exceeds the user's automatic spending limit.",
    reasonCode: "USER_THRESHOLD_EXCEEDED",
  },
  {
    id: "subscription-below-threshold",
    title: "Subscription below threshold",
    request: {
      amount: 15,
      currency: "USD",
      purpose: "Renew design tool",
      merchant: "Design Cloud",
      transactionType: "RENEWAL",
    },
    permission: "Subscription renewals up to $25",
    verdict: "ALLOW",
    reason: "This renewal is within the user's subscription permission.",
    reasonCode: "WITHIN_SUBSCRIPTION_AUTHORITY",
  },
  {
    id: "subscription-price-increase",
    title: "Subscription price increase",
    request: {
      amount: 99,
      currency: "USD",
      purpose: "Renew analytics subscription",
      merchant: "Metric Cloud",
      transactionType: "RENEWAL",
      metadata: { previousAmount: 49 },
    },
    permission: "Ask when a subscription price increases",
    verdict: "ASK",
    reason: "The renewal price is higher than the amount the user previously authorized.",
    reasonCode: "SUBSCRIPTION_PRICE_INCREASED",
  },
  {
    id: "unknown-autonomous-agent",
    title: "Unknown autonomous agent",
    request: {
      amount: 30,
      currency: "EUR",
      purpose: "Buy concert tickets",
      agentId: "unknown-agent",
      transactionType: "PURCHASE",
    },
    permission: "Only recognized apps and agents may spend",
    verdict: "BLOCK",
    reason: "The requesting autonomous agent is not known to the user's Shield.",
    reasonCode: "UNKNOWN_SPENDER_IDENTITY",
  },
  {
    id: "agent-weekly-allowance-exceeded",
    title: "Agent exceeds weekly allowance",
    request: {
      amount: 75,
      currency: "EUR",
      purpose: "Buy travel accessories",
      agentId: "travel-agent-demo",
      transactionType: "PURCHASE",
      metadata: { weeklySpendBeforeRequest: 480, weeklyAllowance: 500 },
    },
    permission: "Travel Agent weekly allowance €500",
    verdict: "BLOCK",
    reason: "This purchase would exceed the agent's weekly spending allowance.",
    reasonCode: "AGENT_ALLOWANCE_EXCEEDED",
  },
  {
    id: "expired-spending-permission",
    title: "Expired spending permission",
    request: {
      amount: 20,
      currency: "USD",
      purpose: "Buy project credits",
      agentId: "project-agent",
      transactionType: "PURCHASE",
      metadata: { permissionExpired: true },
    },
    permission: "Project Agent permission expired",
    verdict: "BLOCK",
    reason: "The spending permission expired before this request was evaluated.",
    reasonCode: "SPENDING_PERMISSION_EXPIRED",
  },
  {
    id: "travel-approval",
    title: "Travel purchase requiring approval",
    request: {
      amount: 267,
      currency: "EUR",
      purpose: "Book hotel in Copenhagen",
      merchant: "Nordhavn Hotel",
      category: "travel",
      agentId: "travel-agent-demo",
      transactionType: "PURCHASE",
    },
    permission: "Travel purchases above €200 require approval",
    verdict: "ASK",
    reason: "Travel purchases above €200 require user approval.",
    reasonCode: "USER_THRESHOLD_EXCEEDED",
  },
  {
    id: "travel-allowance-exceeded",
    title: "Travel allowance exceeded",
    request: {
      amount: 640,
      currency: "EUR",
      purpose: "Book hotel",
      merchant: "Harbor Grand",
      category: "travel",
      agentId: "travel-agent-demo",
      transactionType: "PURCHASE",
    },
    permission: "Travel allowance €500",
    verdict: "BLOCK",
    reason: "Spending authority exceeded.",
    reasonCode: "SPENDING_AUTHORITY_EXCEEDED",
  },
] as const;

export function sandboxScenario(id: SandboxScenarioId): SandboxScenario {
  const scenario = sandboxScenarios.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`Unknown Shield sandbox scenario: ${id}`);
  return scenario;
}

export function evaluateSandbox(
  request: SpendingRequest,
  scenarioId?: SandboxScenarioId,
): { decision: ShieldDecision; dossier: ShieldDossier; permission: string } {
  const fixture = scenarioId ? sandboxScenario(scenarioId) : inferFixture(request);
  const normalizedRequest = normalize(request);
  const digest = stableHash(JSON.stringify(normalizedRequest));
  const requestId = `shr_sbx_${digest}`;
  const decisionId = `dec_sbx_${digest}`;
  const dossierId = `dsr_sbx_${digest}`;
  const decision: ShieldDecision = {
    verdict: fixture.verdict,
    allowed: fixture.verdict === "ALLOW",
    approvalRequired: fixture.verdict === "ASK",
    approvalStatus: fixture.verdict === "ASK" ? "PENDING" : "NOT_REQUIRED",
    reason: fixture.reason,
    reasonCode: fixture.reasonCode,
    requestId,
    decisionId,
    dossierId,
    environment: "sandbox",
    advanced: {
      policyVersion: "shield-sandbox-v1",
      reasonCodes: [fixture.reasonCode],
      evidenceHash: `sandbox:${digest}`,
      evaluationMetadata: {
        scenario: fixture.id,
        permission: fixture.permission,
        evidenceClass: "sandbox_fixture",
      },
    },
  };
  return {
    decision,
    permission: fixture.permission,
    dossier: {
      dossierId,
      decisionId,
      verdict: decision.verdict,
      reasonCode: decision.reasonCode,
      environment: "sandbox",
      evidenceClass: "sandbox_fixture",
      evidenceHash: `sandbox:${digest}`,
      evaluation: {
        scenario: fixture.id,
        permission: fixture.permission,
        request: normalizedRequest,
      },
    },
  };
}

function inferFixture(request: SpendingRequest): SandboxScenario {
  const metadata = request.metadata ?? {};
  const previousAmount = metadata.previousAmount;
  if (request.agentId === "unknown-agent") return sandboxScenario("unknown-autonomous-agent");
  if (metadata.permissionExpired === true) return sandboxScenario("expired-spending-permission");
  if (
    typeof metadata.weeklySpendBeforeRequest === "number" &&
    typeof metadata.weeklyAllowance === "number" &&
    metadata.weeklySpendBeforeRequest + request.amount > metadata.weeklyAllowance
  ) {
    return sandboxScenario("agent-weekly-allowance-exceeded");
  }
  if (typeof previousAmount === "number" && request.amount > previousAmount) {
    return sandboxScenario("subscription-price-increase");
  }
  if (request.amount > 500) return sandboxScenario("travel-allowance-exceeded");
  if (request.amount > 100) return sandboxScenario("purchase-above-limit");
  return request.transactionType === "SUBSCRIPTION" || request.transactionType === "RENEWAL"
    ? sandboxScenario("subscription-below-threshold")
    : sandboxScenario("normal-purchase");
}

function normalize(request: SpendingRequest): SpendingRequest {
  const result: SpendingRequest = {
    amount: request.amount,
    currency: request.currency.toUpperCase(),
    purpose: request.purpose,
  };
  if (request.merchant !== undefined) result.merchant = request.merchant;
  if (request.category !== undefined) result.category = request.category;
  if (request.agentId !== undefined) result.agentId = request.agentId;
  if (request.transactionType !== undefined) result.transactionType = request.transactionType;
  if (request.metadata !== undefined) result.metadata = request.metadata;
  return result;
}

/** Browser-safe deterministic identifier for replayable fixtures. Not a cryptographic signature. */
function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
