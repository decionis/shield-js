import { errorForStatus, ShieldError } from "./errors.js";
import { evaluateSandbox } from "./sandbox.js";
import type {
  AuthorizeOptions,
  ShieldClientOptions,
  ShieldDecision,
  ShieldDecisionAdvanced,
  ShieldDossier,
  ShieldEnvironment,
  ShieldIntegrationIdentity,
  ShieldLogEvent,
  SpendingRequest,
} from "./types.js";

const DEFAULT_PRODUCTION_BASE_URL = "https://api.decionis.com";
const DEFAULT_TIMEOUT_MS = 8_000;

export class ShieldClient {
  readonly environment: ShieldEnvironment;
  readonly identity: ShieldIntegrationIdentity;

  private readonly apiKey: string | undefined;
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetcher: typeof globalThis.fetch | undefined;
  private readonly logger: ((event: ShieldLogEvent) => void) | undefined;
  private readonly logSensitive: boolean;
  private readonly decisions = new Map<string, ShieldDecision>();
  private readonly dossiers = new Map<string, ShieldDossier>();

  constructor(options: ShieldClientOptions = {}) {
    const configuredEnvironment = options.environment ?? readEnvironment();
    this.environment = configuredEnvironment ?? "sandbox";
    this.identity =
      options.identity ??
      (this.environment === "sandbox"
        ? { appId: "shield-sandbox-quickstart", displayName: "Shield Sandbox" }
        : missingIdentity());
    this.apiKey = options.apiKey ?? readVariable("DECIONIS_SHIELD_API_KEY");
    this.baseUrl = (options.baseUrl ?? DEFAULT_PRODUCTION_BASE_URL).replace(/\/$/, "");
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetcher = options.fetch ?? globalThis.fetch?.bind(globalThis);
    this.logger = options.logger;
    this.logSensitive = options.logSensitive ?? false;

    if (this.environment === "production" && !this.apiKey) {
      throw new ShieldError({
        code: "SHIELD_PRODUCTION_KEY_REQUIRED",
        message: "Production authorization requires DECIONIS_SHIELD_API_KEY.",
        action: "Create a production integration and configure its server-side API key.",
      });
    }
    if (this.environment === "production" && isBrowser() && this.apiKey) {
      throw new ShieldError({
        code: "SHIELD_BROWSER_CREDENTIAL_UNSAFE",
        message: "A production Shield API key cannot be embedded in browser code.",
        action: "Call Shield from your server or use a short-lived user-scoped token flow.",
      });
    }
  }

  async authorize(request: SpendingRequest, options: AuthorizeOptions = {}): Promise<ShieldDecision> {
    const normalized = validateRequest(request);
    if (options.scenario && this.environment !== "sandbox") {
      throw new ShieldError({
        code: "SHIELD_ENVIRONMENT_MISMATCH",
        message: "Sandbox scenarios cannot be sent to production.",
        action: "Remove the scenario option or set DECIONIS_SHIELD_ENV=sandbox.",
      });
    }

    const startedAt = Date.now();
    this.emit({
      name: "authorization.requested",
      currency: normalized.currency,
      ...(normalized.agentId === undefined ? {} : { agentId: normalized.agentId }),
      ...(this.logSensitive ? { amount: normalized.amount } : {}),
      environment: this.environment,
    });

    let decision: ShieldDecision;
    if (this.environment === "sandbox") {
      const result = evaluateSandbox(normalized, options.scenario);
      decision = result.decision;
      this.dossiers.set(result.dossier.dossierId, result.dossier);
    } else {
      decision = await this.requestDecision("/v1/shield/authorize", "POST", {
        ...normalized,
      }, options.idempotencyKey ? { "idempotency-key": options.idempotencyKey } : undefined);
    }
    this.decisions.set(decision.decisionId, decision);
    this.emit({
      name: "authorization.decided",
      requestId: decision.requestId,
      decisionId: decision.decisionId,
      verdict: decision.verdict,
      reasonCode: decision.reasonCode,
      latencyMs: Date.now() - startedAt,
      environment: this.environment,
    });
    return decision;
  }

  /**
   * Starts Presence orchestration for an ASK decision. Sandbox approval is an
   * explicit simulated fixture; production starts or polls an intent-bound
   * Presence request and can therefore continue to return ASK while pending.
   */
  async requestApproval(decisionId: string): Promise<ShieldDecision> {
    const current = await this.getDecision(decisionId);
    if (current.verdict !== "ASK") {
      throw new ShieldError({
        code: "SHIELD_INVALID_STATE",
        message: `Decision ${decisionId} does not require approval.`,
        action: current.verdict === "ALLOW" ? "Execute once using this decision." : "Cancel the transaction.",
      });
    }
    this.emit({
      name: "approval.requested",
      decisionId,
      verdict: current.verdict,
      reasonCode: current.reasonCode,
      environment: this.environment,
    });

    if (this.environment === "sandbox") {
      const approved: ShieldDecision = {
        ...current,
        verdict: "ALLOW",
        allowed: true,
        approvalRequired: false,
        approvalStatus: "APPROVED",
        reason: "The sandbox user approved this purchase through a simulated Presence flow.",
        reasonCode: "USER_APPROVED",
        advanced: {
          ...current.advanced,
          reasonCodes: ["USER_APPROVED"],
          evaluationMetadata: {
            ...(current.advanced?.evaluationMetadata ?? {}),
            presence: "sandbox_fixture",
          },
        },
      };
      this.decisions.set(decisionId, approved);
      const dossier = this.dossiers.get(current.dossierId);
      if (dossier) {
        this.dossiers.set(dossier.dossierId, {
          ...dossier,
          verdict: "ALLOW",
          reasonCode: "USER_APPROVED",
          evaluation: { ...(dossier.evaluation ?? {}), presence: "sandbox_fixture" },
        });
      }
      return approved;
    }
    const approved = await this.requestDecision(
      `/v1/shield/decisions/${encodeURIComponent(decisionId)}/approval`,
      "POST",
      {},
    );
    this.decisions.set(decisionId, approved);
    return approved;
  }

  async getDecision(decisionId: string): Promise<ShieldDecision> {
    if (this.environment === "sandbox") {
      const decision = this.decisions.get(decisionId);
      if (!decision) {
        throw new ShieldError({
          code: "SHIELD_INVALID_REQUEST",
          message: `Sandbox decision ${decisionId} is not available in this client instance.`,
          action: "Authorize the sandbox request before reading its decision.",
        });
      }
      return decision;
    }
    return this.requestDecision(`/v1/shield/decisions/${encodeURIComponent(decisionId)}`, "GET");
  }

  async getDossier(dossierId: string): Promise<ShieldDossier> {
    if (this.environment === "sandbox") {
      const dossier = this.dossiers.get(dossierId);
      if (!dossier) {
        throw new ShieldError({
          code: "SHIELD_INVALID_REQUEST",
          message: `Sandbox dossier ${dossierId} is not available in this client instance.`,
          action: "Authorize the sandbox request before reading its dossier.",
        });
      }
      return dossier;
    }
    return this.requestJson<ShieldDossier>(
      `/v1/shield/dossiers/${encodeURIComponent(dossierId)}`,
      "GET",
    );
  }

  private async requestDecision(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
    headers?: Record<string, string>,
  ): Promise<ShieldDecision> {
    const payload = await this.requestJson<unknown>(path, method, body, headers);
    return parseDecision(payload, this.environment);
  }

  private async requestJson<T>(
    path: string,
    method: "GET" | "POST",
    body?: Record<string, unknown>,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    if (!this.fetcher) {
      throw new ShieldError({
        code: "SHIELD_UNAVAILABLE",
        message: "This runtime does not provide fetch().",
        action: "Use Node.js 20+ or provide a compatible fetch implementation.",
      });
    }
    const controller = new AbortController();
    const timeout = globalThis.setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const response = await this.fetcher(`${this.baseUrl}${path}`, {
        method,
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.apiKey ?? ""}`,
          "content-type": "application/json",
          "x-shield-app-id": this.identity.appId,
          "x-shield-environment": this.environment,
          ...extraHeaders,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: controller.signal,
      });
      const payload = (await response.json().catch(() => null)) as unknown;
      if (!response.ok) throw errorForStatus(response.status, payload);
      return payload as T;
    } catch (error) {
      if (error instanceof ShieldError) throw error;
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new ShieldError({
          code: "SHIELD_TIMEOUT",
          message: `Shield did not return a decision within ${this.timeoutMs}ms.`,
          action: "Keep the transaction on hold and retry with the same request context.",
          retryable: true,
          cause: error,
        });
      }
      throw new ShieldError({
        code: "SHIELD_UNAVAILABLE",
        message: "Shield could not be reached.",
        action: "Keep the transaction on hold and retry when connectivity is restored.",
        retryable: true,
        cause: error,
      });
    } finally {
      globalThis.clearTimeout(timeout);
    }
  }

  private emit(event: ShieldLogEvent): void {
    this.logger?.(event);
  }
}

function validateRequest(request: SpendingRequest): SpendingRequest {
  if (!Number.isFinite(request.amount) || request.amount <= 0) {
    invalid("amount", "Use a finite number greater than zero in major currency units.");
  }
  if (!/^[A-Za-z]{3}$/.test(request.currency)) {
    invalid("currency", "Use a three-letter ISO 4217 currency code such as USD or EUR.");
  }
  if (typeof request.purpose !== "string" || request.purpose.trim().length < 3) {
    invalid("purpose", "Describe what will be purchased in at least three characters.");
  }
  if (request.purpose.length > 240) invalid("purpose", "Keep the purpose under 240 characters.");
  const normalized: SpendingRequest = {
    amount: request.amount,
    currency: request.currency.toUpperCase(),
    purpose: request.purpose.trim(),
  };
  if (request.merchant !== undefined) normalized.merchant = request.merchant;
  if (request.category !== undefined) normalized.category = request.category;
  if (request.agentId !== undefined) normalized.agentId = request.agentId;
  if (request.transactionType !== undefined) normalized.transactionType = request.transactionType;
  if (request.metadata !== undefined) normalized.metadata = request.metadata;
  return normalized;
}

function invalid(field: string, action: string): never {
  throw new ShieldError({
    code: "SHIELD_INVALID_REQUEST",
    message: `The spending request field '${field}' is invalid.`,
    action,
  });
}

function parseDecision(payload: unknown, environment: ShieldEnvironment): ShieldDecision {
  if (!payload || typeof payload !== "object") return invalidResponse();
  const value = payload as Record<string, unknown>;
  const verdict = value.verdict;
  if (verdict !== "ALLOW" && verdict !== "ASK" && verdict !== "BLOCK") return invalidResponse();
  for (const field of ["reason", "reasonCode", "requestId", "decisionId", "dossierId"] as const) {
    if (typeof value[field] !== "string") return invalidResponse();
  }
  return {
    verdict,
    allowed: verdict === "ALLOW",
    approvalRequired: verdict === "ASK",
    approvalStatus:
      value.approvalStatus === "APPROVED" ||
      value.approvalStatus === "DENIED" ||
      value.approvalStatus === "EXPIRED" ||
      value.approvalStatus === "NOT_REQUIRED"
        ? value.approvalStatus
        : verdict === "ASK"
          ? "PENDING"
          : "NOT_REQUIRED",
    reason: value.reason as string,
    reasonCode: value.reasonCode as string,
    requestId: value.requestId as string,
    decisionId: value.decisionId as string,
    dossierId: value.dossierId as string,
    environment,
    ...(value.advanced && typeof value.advanced === "object"
      ? { advanced: value.advanced as ShieldDecisionAdvanced }
      : {}),
  };
}

function invalidResponse(): never {
  throw new ShieldError({
    code: "SHIELD_INVALID_RESPONSE",
    message: "Shield returned a response that does not match the ALLOW / ASK / BLOCK contract.",
    action: "Keep the transaction on hold and report the decision ID or request trace to Decionis.",
  });
}

function readVariable(name: string): string | undefined {
  const runtime = globalThis as typeof globalThis & {
    process?: { env?: Record<string, string | undefined> };
  };
  const value = runtime.process?.env?.[name]?.trim();
  return value || undefined;
}

function readEnvironment(): ShieldEnvironment | undefined {
  const value = readVariable("DECIONIS_SHIELD_ENV");
  if (value === undefined) return undefined;
  if (value === "sandbox" || value === "production") return value;
  throw new ShieldError({
    code: "SHIELD_INVALID_REQUEST",
    message: `DECIONIS_SHIELD_ENV must be 'sandbox' or 'production', received '${value}'.`,
    action: "Set DECIONIS_SHIELD_ENV to one of the two supported environments.",
  });
}

function missingIdentity(): never {
  throw new ShieldError({
    code: "SHIELD_INTEGRATION_IDENTITY_REQUIRED",
    message: "Production authorization requires a registered app identity.",
    action: "Configure identity.appId and identity.displayName from the Shield developer dashboard.",
  });
}

function isBrowser(): boolean {
  return typeof globalThis.document !== "undefined";
}
