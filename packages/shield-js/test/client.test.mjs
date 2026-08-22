import assert from "node:assert/strict";
import test from "node:test";
import { ShieldClient, ShieldError, sandboxScenarios } from "../dist/index.js";

test("safe defaults return the first sandbox ALLOW without credentials", async () => {
  const shield = new ShieldClient();
  const decision = await shield.authorize({
    amount: 89,
    currency: "usd",
    purpose: "Book hotel",
    merchant: "Hilton",
  });
  assert.equal(decision.environment, "sandbox");
  assert.equal(decision.verdict, "ALLOW");
  assert.equal(decision.allowed, true);
  assert.equal(decision.approvalRequired, false);
});

test("all named sandbox scenarios return deterministic expected decisions and dossiers", async () => {
  for (const scenario of sandboxScenarios) {
    const shield = new ShieldClient();
    const first = await shield.authorize(scenario.request, { scenario: scenario.id });
    const replay = await shield.authorize(scenario.request, { scenario: scenario.id });
    assert.equal(first.verdict, scenario.verdict, scenario.id);
    assert.equal(first.decisionId, replay.decisionId, scenario.id);
    assert.equal(first.dossierId, replay.dossierId, scenario.id);
    const dossier = await shield.getDossier(first.dossierId);
    assert.equal(dossier.evidenceClass, "sandbox_fixture");
    assert.equal(dossier.verdict, scenario.verdict);
  }
});

test("ASK never reports allowed and becomes ALLOW only after explicit approval", async () => {
  const shield = new ShieldClient();
  const held = await shield.authorize(
    { amount: 267, currency: "EUR", purpose: "Book hotel" },
    { scenario: "travel-approval" },
  );
  assert.equal(held.verdict, "ASK");
  assert.equal(held.allowed, false);
  assert.equal(held.approvalRequired, true);

  const approved = await shield.requestApproval(held.decisionId);
  assert.equal(approved.verdict, "ALLOW");
  assert.equal(approved.approvalStatus, "APPROVED");
});

test("validation errors say execution is unsafe and explain the next action", async () => {
  const shield = new ShieldClient();
  await assert.rejects(
    shield.authorize({ amount: 0, currency: "USD", purpose: "Buy" }),
    (error) => {
      assert.ok(error instanceof ShieldError);
      assert.equal(error.code, "SHIELD_INVALID_REQUEST");
      assert.equal(error.safeToExecute, false);
      assert.match(error.toString(), /Do not execute the transaction/);
      assert.match(error.action, /greater than zero/);
      return true;
    },
  );
});

test("production fails early without an integration identity or credential", () => {
  assert.throws(
    () => new ShieldClient({ environment: "production" }),
    (error) => error instanceof ShieldError && error.safeToExecute === false,
  );
});

test("production maps the wire response and emits privacy-conscious logs", async () => {
  const events = [];
  const shield = new ShieldClient({
    environment: "production",
    apiKey: "shield_pk_test",
    identity: { appId: "app.travel", displayName: "Travel Agent" },
    logger: (event) => events.push(event),
    fetch: async (_url, init) => {
      assert.equal(init.headers["x-shield-app-id"], "app.travel");
      assert.equal(init.headers["idempotency-key"], "hotel-booking-123");
      return new Response(
        JSON.stringify({
          verdict: "BLOCK",
          reason: "The agent allowance is exhausted.",
          reasonCode: "AGENT_ALLOWANCE_EXCEEDED",
          requestId: "shr_123",
          decisionId: "dec_123",
          dossierId: "dsr_123",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    },
  });
  const decision = await shield.authorize(
    {
      amount: 640,
      currency: "EUR",
      purpose: "Book hotel",
      agentId: "travel-agent",
    },
    { idempotencyKey: "hotel-booking-123" },
  );
  assert.equal(decision.verdict, "BLOCK");
  assert.equal(events.length, 2);
  assert.equal("amount" in events[0], false);
});
