#!/usr/bin/env node
import {
  ShieldClient,
  sandboxScenario,
  sandboxScenarios,
  type SandboxScenarioId,
} from "@decionis/shield";
import { renderScenario } from "./output.js";
import { startSandboxServer } from "./server.js";

const args = process.argv.slice(2);

if (args.includes("--help") || args.includes("-h")) {
  printHelp();
  process.exit(0);
}

if (args[0] === "serve") {
  const port = numberArgument("--port") ?? 8787;
  await startSandboxServer(port);
} else {
  const json = args.includes("--json");
  const selected = args.includes("--all")
    ? [...sandboxScenarios]
    : [sandboxScenario((stringArgument("--scenario") ?? "travel-allowance-exceeded") as SandboxScenarioId)];
  const results = [];
  for (const scenario of selected) {
    const shield = new ShieldClient({ environment: "sandbox" });
    const decision = await shield.authorize(scenario.request, { scenario: scenario.id });
    results.push({ scenario, decision });
  }
  if (json) {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log(results.map(({ scenario, decision }) => renderScenario(scenario, decision)).join("\n\n────────────────────────────────────────\n\n"));
  }
}

function stringArgument(name: string): string | undefined {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function numberArgument(name: string): number | undefined {
  const value = stringArgument(name);
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65_535) {
    throw new Error(`${name} must be a valid TCP port.`);
  }
  return parsed;
}

function printHelp(): void {
  console.log(`Shield Sandbox\n\nUsage:\n  shield-demo\n  shield-demo --scenario normal-purchase\n  shield-demo --all\n  shield-demo --all --json\n  shield-demo serve --port 8787\n\nScenarios:\n${sandboxScenarios.map((scenario) => `  ${scenario.id}`).join("\n")}\n\nSandbox evidence is always labeled and can never authorize real money movement.`);
}
