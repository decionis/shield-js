import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

test("all public contracts use one ALLOW / ASK / BLOCK vocabulary", async () => {
  const decision = await readJson("contracts/shield-decision.schema.json");
  const mcp = await readJson("contracts/shield-mcp-tools.json");
  const source = await readFile(new URL("packages/shield-js/src/types.ts", root), "utf8");

  assert.deepEqual(decision.properties.verdict.enum, ["ALLOW", "ASK", "BLOCK"]);
  assert.match(source, /"ALLOW" \| "ASK" \| "BLOCK"/);
  assert.deepEqual(
    mcp.tools.map(({ name }) => name),
    [
      "shield.request_purchase",
      "shield.check_spending_authority",
      "shield.get_permission",
      "shield.request_approval",
      "shield.get_decision",
    ],
  );
});

test("the request stays small and the response stays fail-safe", async () => {
  const request = await readJson("contracts/shield-authorize.schema.json");
  const decision = await readJson("contracts/shield-decision.schema.json");

  assert.deepEqual(request.required, ["amount", "currency", "purpose"]);
  assert.equal(request.additionalProperties, false);
  assert.ok(decision.required.includes("decisionId"));
  assert.ok(decision.required.includes("dossierId"));
  assert.ok(decision.required.includes("approvalRequired"));
});

test("OpenAPI exposes the canonical authorization and evidence routes", async () => {
  const openapi = await readFile(new URL("openapi/shield-api.yaml", root), "utf8");

  assert.match(openapi, /\/v1\/shield\/authorize:/);
  assert.match(openapi, /\/v1\/shield\/decisions\/\{decisionId\}\/approval:/);
  assert.match(openapi, /\/v1\/shield\/dossiers\/\{dossierId\}:/);
  assert.match(openapi, /Applications MUST request authorization before executing/);
  assert.match(openapi, /enum: \[ALLOW, ASK, BLOCK\]/);
});
