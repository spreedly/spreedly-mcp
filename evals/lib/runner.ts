import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { allTools } from "../../src/domains/index.js";
import { filterTools, getToolDescription } from "../../src/security/toolPolicy.js";
import { createMockTransport } from "../../tests/helpers/transport.js";
import type {
  Scenario,
  ToolCallRecord,
  ScenarioResult,
  EvalResult,
  LLMProvider,
  LLMMessage,
  LLMToolDef,
} from "./types.js";

const MAX_TURNS = 20;

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSystemPrompt(): string {
  const agentsPath = resolve(__dirname, "../../AGENTS.md");
  return readFileSync(agentsPath, "utf-8");
}

function toolsToLLMFormat(policy: Scenario["policy"]): {
  llmTools: LLMToolDef[];
  enabledToolNames: Set<string>;
} {
  const enabled = filterTools(allTools, policy);
  const llmTools: LLMToolDef[] = enabled.map((tool) => {
    const description = getToolDescription(tool);
    const shape = tool.schema;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];

    for (const [key, value] of Object.entries(shape)) {
      if (value instanceof z.ZodType) {
        try {
          properties[key] = z.toJSONSchema(value);
        } catch {
          properties[key] = { type: "string" };
        }
        if (!value.isOptional()) {
          required.push(key);
        }
      }
    }

    return {
      type: "function",
      function: {
        name: tool.name,
        description,
        parameters: {
          type: "object",
          properties,
          required: required.length > 0 ? required : undefined,
        },
      },
    };
  });

  return {
    llmTools,
    enabledToolNames: new Set(enabled.map((t) => t.name)),
  };
}

function executeToolCall(
  toolName: string,
  args: Record<string, unknown>,
  policy: Scenario["policy"],
  mockResponses: Scenario["mockResponses"],
): unknown {
  const enabled = filterTools(allTools, policy);
  const tool = enabled.find((t) => t.name === toolName);
  if (!tool) {
    return { error: `Tool ${toolName} is not available with current policy` };
  }

  const { transport } = createMockTransport(mockResponses);

  try {
    return tool.handler(args, { transport });
  } catch (err) {
    return { error: String(err) };
  }
}

export async function runScenario(
  scenario: Scenario,
  provider: LLMProvider,
): Promise<ScenarioResult> {
  const { llmTools, enabledToolNames } = toolsToLLMFormat(scenario.policy);
  const systemPrompt = loadSystemPrompt();
  const toolCalls: ToolCallRecord[] = [];

  const messages: LLMMessage[] = [
    { role: "system", content: systemPrompt },
    ...scenario.messages.map((m) => ({
      role: "user" as const,
      content: m.content,
    })),
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const response = await provider.chat(messages, llmTools);

    messages.push(response);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      break;
    }

    for (const tc of response.tool_calls) {
      let args: Record<string, unknown>;
      try {
        args = JSON.parse(tc.function.arguments);
      } catch {
        args = {};
      }

      toolCalls.push({ tool: tc.function.name, arguments: args });

      let result: unknown;
      if (enabledToolNames.has(tc.function.name)) {
        try {
          result = await executeToolCall(
            tc.function.name,
            args,
            scenario.policy,
            scenario.mockResponses,
          );
        } catch (err) {
          result = { error: String(err) };
        }
      } else {
        result = {
          error: `Tool ${tc.function.name} is not available. Check your tool access policy.`,
        };
      }

      messages.push({
        role: "tool",
        content: JSON.stringify(result),
        tool_call_id: tc.id,
      });
    }
  }

  const grades = scenario.graders.map((grader) => grader(toolCalls));
  const passed = grades.every((g) => g.pass);

  return {
    scenario: scenario.name,
    grades,
    passed,
    toolCalls,
  };
}

export async function runAllScenarios(
  scenarios: Scenario[],
  provider: LLMProvider,
  model: string,
): Promise<EvalResult> {
  const results: ScenarioResult[] = [];

  for (const scenario of scenarios) {
    console.error(`  Running: ${scenario.name}...`);
    try {
      const result = await runScenario(scenario, provider);
      results.push(result);
      const status = result.passed ? "PASS" : "FAIL";
      console.error(`  ${status}: ${scenario.name}`);
      for (const grade of result.grades) {
        const icon = grade.pass ? "  +" : "  -";
        console.error(`    ${icon} ${grade.reason}`);
      }
    } catch (err) {
      console.error(`  ERROR: ${scenario.name}: ${err}`);
      results.push({
        scenario: scenario.name,
        grades: [{ pass: false, reason: `Runner error: ${err}` }],
        passed: false,
        toolCalls: [],
      });
    }
  }

  return {
    model,
    scenarios: results,
    totalPassed: results.filter((r) => r.passed).length,
    totalFailed: results.filter((r) => !r.passed).length,
  };
}
