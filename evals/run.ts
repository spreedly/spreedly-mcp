import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { allScenarios, scenarioGroups } from "./scenarios/index.js";
import { createProvider } from "./lib/providers.js";
import { runAllScenarios } from "./lib/runner.js";
import type { EvalResult } from "./lib/types.js";

loadDotenv();

const MATRIX_MODELS = ["gpt-5-nano", "gpt-5-mini", "gpt-5"];

const { values } = parseArgs({
  options: {
    scenario: { type: "string", short: "s" },
    model: { type: "string", short: "m" },
    matrix: { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
  strict: true,
});

if (values.help) {
  console.log(`
Usage: npm run test:evals [-- options]

Options:
  -s, --scenario <name>   Run a specific scenario group (token-reuse, policy-enforcement, wasteful-patterns)
  -m, --model <model>     Model name (default: gpt-5-nano)
  --matrix                Run against all models: ${MATRIX_MODELS.join(", ")}
  -h, --help              Show this help message

Examples:
  npm run test:evals                              # Run all evals with default model
  npm run test:evals -- --scenario token-reuse    # Run only token-reuse scenarios
  npm run test:evals -- --model gpt-4o            # Use a different model
  npm run test:evals -- --matrix                  # Run against nano, mini, and gpt-5

Environment variables:
  OPENAI_BASE_URL   Override LLM endpoint (default: https://api.openai.com/v1)
  OPENAI_API_KEY    API key for the LLM provider (required)

  Set these in a .env file in the project root, or export them in your shell.
`);
  process.exit(0);
}

const models = values.matrix ? MATRIX_MODELS : [values.model || "gpt-5-nano"];
const scenarioFilter = values.scenario;

let scenarios = allScenarios;
if (scenarioFilter) {
  const group = scenarioGroups[scenarioFilter];
  if (!group) {
    console.error(
      `Unknown scenario group: ${scenarioFilter}. Available: ${Object.keys(scenarioGroups).join(", ")}`,
    );
    process.exit(1);
  }
  scenarios = group;
}

const allResults: EvalResult[] = [];

for (const model of models) {
  console.error(`\nSpreedly MCP Behavioral Evals`);
  console.error(`Model: ${model}`);
  console.error(`Scenarios: ${scenarios.length}\n`);

  const provider = createProvider(model);
  const result = await runAllScenarios(scenarios, provider, model);
  allResults.push(result);
}

if (allResults.length === 1) {
  console.log("\n" + formatResults(allResults[0]));
} else {
  console.log("\n" + formatMatrix(allResults));
}

const failed = allResults.some((r) => r.totalFailed > 0);
process.exit(failed ? 1 : 0);

function formatResults(result: EvalResult): string {
  const lines: string[] = [];
  lines.push("=".repeat(60));
  lines.push(`EVAL RESULTS -- Model: ${result.model}`);
  lines.push("=".repeat(60));

  for (const sr of result.scenarios) {
    const status = sr.passed ? "PASS" : "FAIL";
    lines.push(`\n[${status}] ${sr.scenario}`);
    for (const grade of sr.grades) {
      const icon = grade.pass ? "  + " : "  - ";
      lines.push(`${icon}${grade.reason}`);
    }
    if (sr.toolCalls.length > 0) {
      lines.push(`  Tool calls: ${sr.toolCalls.map((tc) => tc.tool).join(" -> ")}`);
    }
  }

  lines.push("\n" + "-".repeat(60));
  lines.push(
    `Total: ${result.totalPassed + result.totalFailed} | Passed: ${result.totalPassed} | Failed: ${result.totalFailed}`,
  );
  lines.push("-".repeat(60));

  return lines.join("\n");
}

function formatMatrix(results: EvalResult[]): string {
  const lines: string[] = [];

  const scenarioNames = results[0].scenarios.map((s) => s.scenario);
  const modelNames = results.map((r) => r.model);

  lines.push("=".repeat(60));
  lines.push("EVAL MATRIX RESULTS");
  lines.push("=".repeat(60));

  const modelColWidth = Math.max(...modelNames.map((m) => m.length), 5);
  const header =
    "Scenario".padEnd(55) + modelNames.map((m) => m.padStart(modelColWidth + 2)).join("");
  lines.push("\n" + header);
  lines.push("-".repeat(header.length));

  for (const name of scenarioNames) {
    const cells = results.map((r) => {
      const sr = r.scenarios.find((s) => s.scenario === name);
      return sr?.passed ? "PASS" : "FAIL";
    });
    const row =
      name.slice(0, 53).padEnd(55) + cells.map((c) => c.padStart(modelColWidth + 2)).join("");
    lines.push(row);
  }

  lines.push("-".repeat(header.length));

  const totals = results.map((r) => `${r.totalPassed}/${r.totalPassed + r.totalFailed}`);
  const totalRow =
    "Total passed".padEnd(55) + totals.map((t) => t.padStart(modelColWidth + 2)).join("");
  lines.push(totalRow);

  lines.push("\n");

  for (const result of results) {
    lines.push(formatResults(result));
    lines.push("");
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
