import { createMcpHarness, type McpHarness } from "../../tests/helpers/mcp-harness.js";
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
const DEFAULT_CONCURRENCY = 5;

async function runWithConcurrency<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < tasks.length) {
      const idx = nextIndex++;
      results[idx] = await tasks[idx]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

interface McpTool {
  name: string;
  description?: string;
  inputSchema: { type: "object"; properties?: Record<string, object>; required?: string[] };
  annotations?: Record<string, unknown>;
}

function mcpToolsToLLMFormat(tools: McpTool[]): LLMToolDef[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description ?? "",
      parameters: tool.inputSchema,
    },
  }));
}

function extractCallToolText(result: Record<string, unknown>): string {
  if ("content" in result && Array.isArray(result.content)) {
    const texts = (result.content as Array<{ type?: string; text?: string }>)
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "");
    return texts.join("\n");
  }
  return JSON.stringify(result);
}

export async function runScenario(
  scenario: Scenario,
  provider: LLMProvider,
  group: string,
): Promise<ScenarioResult> {
  let harness: McpHarness | undefined;
  try {
    harness = await createMcpHarness(scenario.policy, scenario.mockResponses);

    const instructions = harness.client.getInstructions();
    const { tools } = await harness.client.listTools();
    const llmTools = mcpToolsToLLMFormat(tools as McpTool[]);
    const enabledToolNames = new Set(tools.map((t) => t.name));

    const toolCalls: ToolCallRecord[] = [];
    let finalResponse: string | undefined;

    const messages: LLMMessage[] = [];
    if (instructions) {
      messages.push({ role: "system", content: instructions });
    }
    if (scenario.systemPrompt) {
      messages.push({ role: "system", content: scenario.systemPrompt });
    }
    messages.push(
      ...scenario.messages.map((m) => ({
        role: "user" as const,
        content: m.content,
      })),
    );

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

        let resultText: string;
        if (enabledToolNames.has(tc.function.name)) {
          try {
            const callResult = await harness.client.callTool({
              name: tc.function.name,
              arguments: args,
            });
            resultText = extractCallToolText(callResult as Record<string, unknown>);
          } catch (err) {
            resultText = JSON.stringify({ error: String(err) });
          }
        } else {
          resultText = JSON.stringify({
            error: `Tool ${tc.function.name} is not available. Check your tool access policy.`,
          });
        }

        messages.push({
          role: "tool",
          content: resultText,
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
  } finally {
    if (harness) await harness.close();
  }
}

export async function runAllScenarios(
  groups: Record<string, Scenario[]>,
  provider: LLMProvider,
  model: string,
  concurrency: number = DEFAULT_CONCURRENCY,
): Promise<EvalResult> {
  const totalScenarios = Object.values(groups).reduce((n, s) => n + s.length, 0);
  console.error(`  Running ${totalScenarios} scenarios (concurrency: ${concurrency})...\n`);

  const groupEntries = Object.entries(groups);

  const tasks = groupEntries.flatMap(([groupName, scenarios]) =>
    scenarios.map((scenario) => async (): Promise<ScenarioResult> => {
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

  const results = await runWithConcurrency(tasks, concurrency);

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
