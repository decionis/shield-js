import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { ShieldClient, ShieldError, type SandboxScenarioId, type SpendingRequest } from "@decionis/shield";

const MAX_BODY_BYTES = 1_000_000;

export async function startSandboxServer(port: number): Promise<void> {
  const server = createServer(async (request, response) => {
    try {
      await route(request, response);
    } catch (error) {
      const shieldError =
        error instanceof ShieldError
          ? error
          : new ShieldError({
              code: "SHIELD_INVALID_REQUEST",
              message: error instanceof Error ? error.message : "Invalid sandbox request.",
              action: "Check the request body and retry.",
            });
      sendJson(response, 400, {
        error: {
          code: shieldError.code,
          message: shieldError.message,
          safeToExecute: shieldError.safeToExecute,
          retryable: shieldError.retryable,
          action: shieldError.action,
        },
      });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  console.log(`Shield Sandbox REST API\n\nEnvironment: SANDBOX\nNo real money can move.\n\nListening: http://127.0.0.1:${port}\nPOST /v1/shield/authorize`);
}

async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://127.0.0.1");
  if (request.method === "GET" && url.pathname === "/health") {
    sendJson(response, 200, { ok: true, environment: "sandbox", movesRealMoney: false });
    return;
  }
  if (request.method === "POST" && url.pathname === "/v1/shield/authorize") {
    const body = (await readJson(request)) as SpendingRequest;
    const scenarioHeader = request.headers["x-shield-scenario"];
    const scenario =
      typeof scenarioHeader === "string" ? (scenarioHeader as SandboxScenarioId) : undefined;
    const shield = new ShieldClient({ environment: "sandbox" });
    const decision = await shield.authorize(body, scenario ? { scenario } : {});
    sendJson(response, 200, decision);
    return;
  }
  sendJson(response, 404, {
    error: {
      code: "SHIELD_ROUTE_NOT_FOUND",
      message: "Use POST /v1/shield/authorize.",
      safeToExecute: false,
    },
  });
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.byteLength;
    if (bytes > MAX_BODY_BYTES) throw new Error("Request body exceeds 1 MB.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Request body must be valid JSON.");
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-shield-environment": "sandbox",
  });
  response.end(JSON.stringify(body, null, 2));
}
