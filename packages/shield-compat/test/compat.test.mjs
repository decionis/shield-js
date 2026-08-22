import assert from "node:assert/strict";
import test from "node:test";
import { runCompatibilitySuite } from "../dist/index.js";

const correct = async ({ request, shield, execute }) => {
  let decision = await shield.authorize(request);
  if (decision.verdict === "ASK") decision = await shield.requestApproval(decision.decisionId);
  if (decision.verdict === "ALLOW") {
    await execute({ request, decisionId: decision.decisionId });
  }
};

test("reference integration passes every compatibility check", async () => {
  const report = await runCompatibilitySuite(correct);
  assert.equal(report.passed, true);
  assert.equal(report.checks.length, 7);
});

test("application that treats ASK as ALLOW gets an actionable failure", async () => {
  const unsafe = async ({ request, shield, execute }) => {
    const decision = await shield.authorize(request);
    if (decision.verdict !== "BLOCK") await execute({ request, decisionId: decision.decisionId });
  };
  const report = await runCompatibilitySuite(unsafe);
  assert.equal(report.passed, false);
  const ask = report.checks.find((check) => check.name === "waits on ASK");
  assert.equal(ask.passed, false);
  assert.match(ask.failure, /executed the transaction before approval/);
});
