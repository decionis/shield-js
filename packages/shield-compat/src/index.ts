import {
  ShieldClient,
  type SandboxScenarioId,
  type ShieldDecision,
  type SpendingRequest,
} from "@decionis/shield";

export interface ShieldCompatibilityExecution {
  request: SpendingRequest;
  decisionId: string;
}

export interface ShieldCompatibilityAdapterInput {
  request: SpendingRequest;
  shield: Pick<ShieldClient, "authorize" | "requestApproval">;
  execute: (execution: ShieldCompatibilityExecution) => Promise<void>;
}

export type ShieldCompatibilityAdapter = (
  input: ShieldCompatibilityAdapterInput,
) => Promise<void>;

export interface CompatibilityCheck {
  name: string;
  passed: boolean;
  failure?: string;
  expected?: string;
  observed?: string;
}

export interface CompatibilityReport {
  suiteVersion: "shield-compat-v1";
  passed: boolean;
  checks: CompatibilityCheck[];
}

interface TraceEntry {
  operation: "authorize:start" | "authorize:result" | "approval:start" | "approval:result" | "execute";
  decision?: ShieldDecision;
  request?: SpendingRequest;
  execution?: ShieldCompatibilityExecution;
}

export async function runCompatibilitySuite(
  adapter: ShieldCompatibilityAdapter,
): Promise<CompatibilityReport> {
  const checks = await Promise.all([
    allowCheck(adapter),
    blockCheck(adapter),
    askCheck(adapter),
    expiredCheck(adapter),
  ]);
  const contextCheck = checks.find((check) => check.name === "sends required transaction context");
  if (!contextCheck) checks.push(await requiredContextCheck(adapter));
  checks.push(await decisionIdCheck(adapter));
  checks.push(await authorizationOrderCheck(adapter));
  return {
    suiteVersion: "shield-compat-v1",
    passed: checks.every((check) => check.passed),
    checks,
  };
}

async function allowCheck(adapter: ShieldCompatibilityAdapter): Promise<CompatibilityCheck> {
  const trace = await run(adapter, "normal-purchase", {
    amount: 9,
    currency: "USD",
    purpose: "Buy supplies",
  });
  const executes = trace.filter((entry) => entry.operation === "execute");
  return check(
    "respects ALLOW",
    executes.length === 1,
    "execute exactly once after ALLOW",
    `execute called ${executes.length} time(s)`,
  );
}

async function blockCheck(adapter: ShieldCompatibilityAdapter): Promise<CompatibilityCheck> {
  const trace = await run(adapter, "travel-allowance-exceeded", {
    amount: 640,
    currency: "EUR",
    purpose: "Book hotel",
  });
  const executed = trace.some((entry) => entry.operation === "execute");
  return check(
    "respects BLOCK",
    !executed,
    "cancel without executing",
    executed ? "execute() was called after BLOCK" : "transaction was not executed",
    executed ? "BLOCK response ignored\n\nYour application executed the transaction after Shield returned BLOCK." : undefined,
  );
}

async function askCheck(adapter: ShieldCompatibilityAdapter): Promise<CompatibilityCheck> {
  const trace = await run(adapter, "travel-approval", {
    amount: 267,
    currency: "EUR",
    purpose: "Book hotel",
  });
  const approvalResult = trace.findIndex((entry) => entry.operation === "approval:result");
  const execute = trace.findIndex((entry) => entry.operation === "execute");
  const passed = approvalResult >= 0 && execute > approvalResult;
  return check(
    "waits on ASK",
    passed,
    "requestApproval(), wait for ALLOW, then execute()",
    execute < 0
      ? "execute() was never called after sandbox approval"
      : approvalResult < 0
        ? "requestApproval() was not called"
        : execute < approvalResult
          ? "execute() ran before approval completed"
          : "approval completed before execute()",
    passed
      ? undefined
      : "ASK response ignored\n\nYour application executed the transaction before approval was granted.",
  );
}

async function expiredCheck(adapter: ShieldCompatibilityAdapter): Promise<CompatibilityCheck> {
  const trace = await run(adapter, "expired-spending-permission", {
    amount: 20,
    currency: "USD",
    purpose: "Buy project credits",
    agentId: "project-agent",
    metadata: { permissionExpired: true },
  });
  const executed = trace.some((entry) => entry.operation === "execute");
  return check(
    "handles expired permissions",
    !executed,
    "stop and request new authority",
    executed ? "execute() was called with expired authority" : "expired authority was rejected",
  );
}

async function requiredContextCheck(adapter: ShieldCompatibilityAdapter): Promise<CompatibilityCheck> {
  const original: SpendingRequest = {
    amount: 89,
    currency: "USD",
    purpose: "Book hotel",
    merchant: "Hilton",
  };
  const trace = await run(adapter, "normal-purchase", original);
  const sent = trace.find((entry) => entry.operation === "authorize:start")?.request;
  const passed =
    sent?.amount === original.amount &&
    sent.currency === original.currency &&
    sent.purpose === original.purpose;
  return check(
    "sends required transaction context",
    passed,
    "forward amount, currency, and clear purpose unchanged",
    sent ? JSON.stringify(sent) : "authorize() was not called",
  );
}

async function decisionIdCheck(adapter: ShieldCompatibilityAdapter): Promise<CompatibilityCheck> {
  const trace = await run(adapter, "normal-purchase", {
    amount: 9,
    currency: "USD",
    purpose: "Buy supplies",
  });
  const decisionId = trace.find((entry) => entry.operation === "authorize:result")?.decision?.decisionId;
  const executionId = trace.find((entry) => entry.operation === "execute")?.execution?.decisionId;
  return check(
    "preserves decision ID",
    typeof decisionId === "string" && decisionId === executionId,
    "pass the Shield decision ID into the downstream execution record",
    executionId ?? "no decision ID was preserved",
  );
}

async function authorizationOrderCheck(adapter: ShieldCompatibilityAdapter): Promise<CompatibilityCheck> {
  const trace = await run(adapter, "normal-purchase", {
    amount: 9,
    currency: "USD",
    purpose: "Buy supplies",
  });
  const authorized = trace.findIndex((entry) => entry.operation === "authorize:result");
  const execute = trace.findIndex((entry) => entry.operation === "execute");
  return check(
    "does not execute before authorization",
    authorized >= 0 && execute > authorized,
    "await authorize() before execute()",
    execute < authorized ? "execute() ran before authorization returned" : "authorization preceded execution",
  );
}

async function run(
  adapter: ShieldCompatibilityAdapter,
  scenario: SandboxScenarioId,
  request: SpendingRequest,
): Promise<TraceEntry[]> {
  const trace: TraceEntry[] = [];
  const real = new ShieldClient({ environment: "sandbox" });
  const shield = {
    authorize: async (sent: SpendingRequest) => {
      trace.push({ operation: "authorize:start", request: sent });
      const decision = await real.authorize(sent, { scenario: scenario as never });
      trace.push({ operation: "authorize:result", decision });
      return decision;
    },
    requestApproval: async (decisionId: string) => {
      trace.push({ operation: "approval:start" });
      const decision = await real.requestApproval(decisionId);
      trace.push({ operation: "approval:result", decision });
      return decision;
    },
  } as Pick<ShieldClient, "authorize" | "requestApproval">;
  await adapter({
    request,
    shield,
    execute: async (execution) => {
      trace.push({ operation: "execute", execution });
    },
  });
  return trace;
}

function check(
  name: string,
  passed: boolean,
  expected: string,
  observed: string,
  failure?: string,
): CompatibilityCheck {
  return {
    name,
    passed,
    ...(failure === undefined ? {} : { failure }),
    expected,
    observed,
  };
}
