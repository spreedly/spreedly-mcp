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
  EvalGroupResult,
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
  group: string,
): Promise<ScenarioResult> {
  const { llmTools, enabledToolNames } = toolsToLLMFormat(scenario.policy);
  const systemPrompt = loadSystemPrompt();
  const toolCalls: ToolCallRecord[] = [];
  let finalResponse: string | undefined;

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
      finalResponse = response.content || undefined;
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

  const grades = scenario.graders.map((grader) => grader(toolCalls, messages));
  const passed = grades.every((g) => g.pass);

  return {
    scenario: scenario.name,
    group,
    grades,
    passed,
    toolCalls,
    finalResponse,
  };
}

export async function runAllScenarios(
  groups: Record<string, Scenario[]>,
  provider: LLMProvider,
  model: string,
): Promise<EvalResult> {
  const totalScenarios = Object.values(groups).reduce((n, s) => n + s.length, 0);
  console.error(`  Running ${totalScenarios} scenarios concurrently...\n`);

  const groupEntries = Object.entries(groups);

  const allPromises = groupEntries.flatMap(([groupName, scenarios]) =>
    scenarios.map(async (scenario): Promise<ScenarioResult> => {
      try {
        const result = await runScenario(scenario, provider, groupName);
        const status = result.passed ? "PASS" : "FAIL";
        console.error(`  ${status}: ${scenario.name}`);
        for (const grade of result.grades) {
          const icon = grade.pass ? "  +" : "  -";
          console.error(`    ${icon} ${grade.reason}`);
        }
        return result;
      } catch (err) {
        console.error(`  ERROR: ${scenario.name}: ${err}`);
        return {
          scenario: scenario.name,
          group: groupName,
          grades: [{ pass: false, reason: `Runner error: ${err}` }],
          passed: false,
          toolCalls: [],
        };
      }
    }),
  );

  const results = await Promise.all(allPromises);

  const evalGroups: EvalGroupResult[] = groupEntries.map(([groupName]) => {
    const groupResults = results.filter((r) => r.group === groupName);
    return {
      group: groupName,
      scenarios: groupResults,
      totalPassed: groupResults.filter((r) => r.passed).length,
      totalFailed: groupResults.filter((r) => !r.passed).length,
    };
  });

  return {
    model,
    groups: evalGroups,
    totalPassed: results.filter((r) => r.passed).length,
    totalFailed: results.filter((r) => !r.passed).length,
  };
}
