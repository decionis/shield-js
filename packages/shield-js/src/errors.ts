export type ShieldErrorCode =
  | "SHIELD_INVALID_REQUEST"
  | "SHIELD_INVALID_STATE"
  | "SHIELD_PRODUCTION_KEY_REQUIRED"
  | "SHIELD_INTEGRATION_IDENTITY_REQUIRED"
  | "SHIELD_BROWSER_CREDENTIAL_UNSAFE"
  | "SHIELD_AUTHENTICATION_FAILED"
  | "SHIELD_RATE_LIMITED"
  | "SHIELD_TIMEOUT"
  | "SHIELD_UNAVAILABLE"
  | "SHIELD_ENVIRONMENT_MISMATCH"
  | "SHIELD_IDEMPOTENCY_CONTEXT_MISMATCH"
  | "SHIELD_INVALID_RESPONSE";

export class ShieldError extends Error {
  readonly code: ShieldErrorCode;
  readonly safeToExecute = false;
  readonly retryable: boolean;
  readonly action: string;
  readonly status?: number;

  constructor(input: {
    code: ShieldErrorCode;
    message: string;
    action: string;
    retryable?: boolean;
    status?: number;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "ShieldError";
    this.code = input.code;
    this.action = input.action;
    this.retryable = input.retryable ?? false;
    if (input.status !== undefined) this.status = input.status;
  }

  override toString(): string {
    return `${this.code}\n\n${this.message}\n\nDo not execute the transaction.\n\nNext: ${this.action}`;
  }
}

export function errorForStatus(status: number, body: unknown): ShieldError {
  const serverMessage = readServerMessage(body);
  if (status === 401 || status === 403) {
    return new ShieldError({
      code: "SHIELD_AUTHENTICATION_FAILED",
      message: serverMessage ?? "Shield could not authenticate this integration.",
      action: "Check the production API key and registered app identity, then retry.",
      status,
    });
  }
  if (status === 409) {
    const serverCode = readServerCode(body);
    if (serverCode === "SHIELD_IDEMPOTENCY_CONTEXT_MISMATCH") {
      return new ShieldError({
        code: "SHIELD_IDEMPOTENCY_CONTEXT_MISMATCH",
        message: serverMessage ?? "This idempotency key is bound to a different spending request.",
        action: "Use the same key only for an exact retry, or create a new key for a new action.",
        status,
      });
    }
    return new ShieldError({
      code: "SHIELD_ENVIRONMENT_MISMATCH",
      message: serverMessage ?? "A sandbox credential or fixture was sent to production.",
      action: "Use matching sandbox or production configuration. Never reuse sandbox evidence.",
      status,
    });
  }
  if (status === 429) {
    return new ShieldError({
      code: "SHIELD_RATE_LIMITED",
      message: serverMessage ?? "Shield is receiving too many authorization requests.",
      action: "Retry with exponential backoff and the same idempotency context.",
      retryable: true,
      status,
    });
  }
  return new ShieldError({
    code: "SHIELD_UNAVAILABLE",
    message: serverMessage ?? `Shield authorization failed with HTTP ${status}.`,
    action: "Keep the transaction on hold and retry only when Shield is available.",
    retryable: status >= 500,
    status,
  });
}

function readServerCode(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  return typeof value.error === "string" ? value.error : undefined;
}

function readServerMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = body as Record<string, unknown>;
  return typeof value.message === "string" ? value.message : undefined;
}
