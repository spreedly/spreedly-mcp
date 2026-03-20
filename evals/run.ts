import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { scenarioGroups } from "./scenarios/index.js";
import { createProvider } from "./lib/providers.js";
import { runAllScenarios } from "./lib/runner.js";
import type { EvalResult, Scenario } from "./lib/types.js";

loadDotenv();

const { values } = parseArgs({
  options: {
    scenario: { type: "string", short: "s" },
    model: { type: "string", short: "m" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage: npm run test:evals [-- options]

Options:
  -s, --scenario <name>   Run a specific scenario group (token-reuse, policy-enforcement, wasteful-patterns)
  -m, --model <model>     Model name (default: gpt-5.4-nano)
  -h, --help              Show this help message

Examples:
  npm run test:evals                              # Run all evals with default model
  npm run test:evals -- --scenario token-reuse    # Run only token-reuse scenarios
  npm run test:evals -- --model gpt-4o            # Use a different model

Environment variables:
  OPENAI_BASE_URL   Override LLM endpoint (default: https://api.openai.com/v1)
  OPENAI_API_KEY    API key for the LLM provider (required)

  Set these in a .env file in the project root, or export them in your shell.
`);
  process.exit(0);
}

const model = values.model || "gpt-5.4-nano";
const scenarioFilter = values.scenario;

let groups: Record<string, Scenario[]>;
if (scenarioFilter) {
  const group = scenarioGroups[scenarioFilter];
  if (!group) {
    console.error(
      `Unknown scenario group: ${scenarioFilter}. Available: ${Object.keys(scenarioGroups).join(", ")}`,
    );
    process.exit(1);
  }
  groups = { [scenarioFilter]: group };
} else {
  groups = scenarioGroups;
}

const totalScenarios = Object.values(groups).reduce((n, s) => n + s.length, 0);
console.error(`\nSpreedly MCP Behavioral Evals`);
console.error(`Model: ${model}`);
console.error(`Scenarios: ${totalScenarios}\n`);

const provider = createProvider(model);
const result = await runAllScenarios(groups, provider, model);

console.log("\n" + formatResults(result));

process.exit(result.totalFailed > 0 ? 1 : 0);

function formatResults(result: EvalResult): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push(`EVAL RESULTS -- Model: ${result.model}`);
  lines.push("=".repeat(60));

  for (const group of result.groups) {
    const groupTotal = group.totalPassed + group.totalFailed;
    lines.push(`\n--- ${group.group} (${group.totalPassed}/${groupTotal}) ---`);

    for (const sr of group.scenarios) {
      const status = sr.passed ? "PASS" : "FAIL";
      lines.push(`  [${status}] ${sr.scenario}`);
    }
  }

  const total = result.totalPassed + result.totalFailed;
  lines.push("\n" + "-".repeat(60));
  lines.push(`Total: ${total} | Passed: ${result.totalPassed} | Failed: ${result.totalFailed}`);
  lines.push("-".repeat(60));

  const failures = result.groups.flatMap((g) => g.scenarios.filter((s) => !s.passed));
  if (failures.length > 0) {
    lines.push("\n" + "=".repeat(60));
    lines.push("FAILURES");
    lines.push("=".repeat(60));

    for (const sr of failures) {
      lines.push(`\n  [FAIL] ${sr.scenario}`);
      for (const grade of sr.grades) {
        const icon = grade.pass ? "    + " : "    - ";
        lines.push(`${icon}${grade.reason}`);
      }
      if (sr.toolCalls.length > 0) {
        lines.push("    Tool calls:");
        for (const [i, tc] of sr.toolCalls.entries()) {
          const args =
            Object.keys(tc.arguments).length > 0 ? `(${JSON.stringify(tc.arguments)})` : "()";
          lines.push(`      ${i + 1}. ${tc.tool}${args}`);
        }
      }
      if (sr.finalResponse) {
        lines.push("    Model's final response:");
        for (const line of sr.finalResponse.split("\n")) {
          lines.push(`      ${line}`);
        }
      }
    }
  }

  return lines.join("\n");
}

function loadDotenv(): void {
  try {
    const content = readFileSync(".env", "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      const value = trimmed
        .slice(eqIdx + 1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  } catch {
    // .env file is optional
  }
}
