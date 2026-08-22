#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { runCompatibilitySuite, type ShieldCompatibilityAdapter } from "./index.js";

const path = resolve(process.argv[2] ?? "shield.compat.mjs");
let loaded: Record<string, unknown>;
try {
  loaded = (await import(pathToFileURL(path).href)) as Record<string, unknown>;
} catch (error) {
  console.error(`Shield Compatibility Suite\n\nCould not load ${path}.\n\nCreate shield.compat.mjs exporting:\n\nexport async function attempt({ request, shield, execute }) {\n  const decision = await shield.authorize(request);\n  if (decision.verdict === "ALLOW") {\n    await execute({ request, decisionId: decision.decisionId });\n  } else if (decision.verdict === "ASK") {\n    const final = await shield.requestApproval(decision.decisionId);\n    if (final.verdict === "ALLOW") {\n      await execute({ request, decisionId: final.decisionId });\n    }\n  }\n}\n\n${error instanceof Error ? error.message : ""}`);
  process.exitCode = 2;
  loaded = {};
}

if (typeof loaded.attempt === "function") {
  const report = await runCompatibilitySuite(loaded.attempt as ShieldCompatibilityAdapter);
  console.log("Shield Compatibility Suite\n");
  for (const result of report.checks) {
    console.log(`${result.passed ? "✓" : "FAIL:"} ${result.name}`);
    if (!result.passed) {
      if (result.failure) console.log(`\n${result.failure}`);
      console.log(`\nExpected:\n${result.expected}\n\nObserved:\n${result.observed}\n`);
    }
  }
  console.log(`\n${report.passed ? "PASS — eligible for self-attested Works with Shield status." : "FAIL — fix the errors above before using the Works with Shield badge."}`);
  if (!report.passed) process.exitCode = 1;
}
