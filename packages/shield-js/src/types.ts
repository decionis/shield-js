export type ShieldEnvironment = "sandbox" | "production";

export type ShieldVerdict = "ALLOW" | "ASK" | "BLOCK";

export type ShieldTransactionType =
  | "PURCHASE"
  | "SUBSCRIPTION"
  | "RENEWAL"
  | "TRANSFER"
  | "REFUND"
  | "OTHER";

export type ApprovalStatus = "NOT_REQUIRED" | "PENDING" | "APPROVED" | "DENIED" | "EXPIRED";

export interface ShieldIntegrationIdentity {
  /** Stable identifier registered to the application, for example app.travel.demo. */
  appId: string;
  /** Name shown to the consumer in Shield approval requests. */
  displayName: string;
  developer?: string;
  iconUrl?: string;
}

export interface SpendingRequest {
  amount: number;
  currency: string;
  purpose: string;
  merchant?: string;
  category?: string;
  agentId?: string;
  transactionType?: ShieldTransactionType;
  metadata?: Record<string, unknown>;
}

export interface ShieldDecisionAdvanced {
  policyVersion?: string;
  reasonCodes?: string[];
  evidenceHash?: string;
  signatures?: Record<string, unknown>;
  evaluationMetadata?: Record<string, unknown>;
}

export interface ShieldDecision {
  verdict: ShieldVerdict;
  allowed: boolean;
  approvalRequired: boolean;
  approvalStatus: ApprovalStatus;
  reason: string;
  reasonCode: string;
  requestId: string;
  decisionId: string;
  dossierId: string;
  environment: ShieldEnvironment;
  advanced?: ShieldDecisionAdvanced;
}

export interface ShieldDossier {
  dossierId: string;
  decisionId: string;
  verdict: ShieldVerdict;
  reasonCode: string;
  environment: ShieldEnvironment;
  evidenceClass: "sandbox_fixture" | "production";
  evidenceHash?: string;
  signatures?: Record<string, unknown>;
  evaluation?: Record<string, unknown>;
}

export interface ShieldLogEvent {
  name: "authorization.requested" | "authorization.decided" | "approval.requested";
  requestId?: string;
  decisionId?: string;
  verdict?: ShieldVerdict;
  reasonCode?: string;
  currency?: string;
  amount?: number;
  agentId?: string;
  latencyMs?: number;
  environment: ShieldEnvironment;
}

export interface ShieldClientOptions {
  /** Safe default: sandbox. Production is never inferred from an API key. */
  environment?: ShieldEnvironment;
  apiKey?: string;
  baseUrl?: string;
  identity?: ShieldIntegrationIdentity;
  timeoutMs?: number;
  fetch?: typeof globalThis.fetch;
  logger?: (event: ShieldLogEvent) => void;
  /** Amounts are excluded from logs unless the integrator opts in. */
  logSensitive?: boolean;
}

export interface AuthorizeOptions {
  /** Deterministic fixture. Accepted only in the sandbox environment. */
  scenario?: SandboxScenarioId;
  /** Stable retry key. Replays return the original production decision. */
  idempotencyKey?: string;
}

export type SandboxScenarioId =
  | "normal-purchase"
  | "purchase-above-limit"
  | "subscription-below-threshold"
  | "subscription-price-increase"
  | "unknown-autonomous-agent"
  | "agent-weekly-allowance-exceeded"
  | "expired-spending-permission"
  | "travel-approval"
  | "travel-allowance-exceeded";

export interface SandboxScenario {
  id: SandboxScenarioId;
  title: string;
  request: SpendingRequest;
  permission: string;
  verdict: ShieldVerdict;
  reason: string;
  reasonCode: string;
}
