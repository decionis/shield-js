import assert from "node:assert/strict";
import test from "node:test";
import { ShieldClient, sandboxScenario } from "@decionis/shield";
import { renderScenario } from "../dist/output.js";

test("CLI output teaches the enforcement boundary and what to do with BLOCK", async () => {
  const scenario = sandboxScenario("travel-allowance-exceeded");
  const decision = await new ShieldClient().authorize(scenario.request, { scenario: scenario.id });
  const output = renderScenario(scenario, decision);
  assert.match(output, /Environment: SANDBOX/);
  assert.match(output, /No real money can move/);
  assert.match(output, /Decision:\nBLOCK/);
  assert.match(output, /STOP\. Do not execute the transaction/);
  assert.match(output, /dec_sbx_/);
  assert.match(output, /dsr_sbx_/);
});
