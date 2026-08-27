import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { createProvider } from "../../evals/lib/providers.js";
import { runScenario } from "../../evals/lib/runner.js";
import { transactionDisabledRejectsPayment } from "../../evals/scenarios/policy-enforcement.js";
import { askForCurrency } from "../../evals/scenarios/operator-fidelity.js";
import type { Scenario, ScenarioResult } from "../../evals/lib/types.js";

// Stub /v1/responses server. The queue is the reply sequence for one scenario;
// the last entry repeats if the runner keeps going.
let replies: object[] = [];
let server: Server;
const savedEnv: Record<string, string | undefined> = {};

const envelope = (fields: object) => ({
  id: "resp_stub",
  object: "response",
  model: "stub",
  status: "completed",
  output: [],
  usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
  ...fields,
});

// What the Responses API returns for an incomplete reply (max_output_tokens,
// content filter), and what some OSS /v1/responses servers return.
const emptyReply = envelope({
  status: "incomplete",
  incomplete_details: { reason: "max_output_tokens" },
  output: [],
});

const textReply = (text: string) =>
  envelope({
    output: [
      {
        type: "message",
        id: "msg_1",
        role: "assistant",
        status: "completed",
        content: [{ type: "output_text", text, annotations: [] }],
      },
    ],
  });

const toolCallReply = (name: string, args: object) =>
  envelope({
    output: [
      {
        type: "function_call",
        id: "fc_1",
        call_id: "call_1",
        name,
        arguments: JSON.stringify(args),
        status: "completed",
      },
    ],
  });

function setEnv(key: string, value: string): void {
  savedEnv[key] = process.env[key];
  process.env[key] = value;
}

beforeAll(async () => {
  server = createServer((_req, res) => {
    const reply = replies.length > 1 ? replies.shift() : replies[0];
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(reply ?? emptyReply));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  setEnv("OPENAI_BASE_URL", `http://127.0.0.1:${port}/v1`);
  setEnv("OPENAI_API_KEY", "test-key-not-real");
  setEnv("EVAL_API", "responses");
});

afterAll(async () => {
  for (const [key, value] of Object.entries(savedEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  replies = [emptyReply];
});

/** A scenario must not report `passed` when the provider produced nothing. */
async function runStubbedScenario(
  scenario: Scenario,
  group: string,
): Promise<{ passed: boolean; error?: string }> {
  const provider = createProvider("stub", { api: "responses" });
  let result: ScenarioResult;
  try {
    result = await runScenario(scenario, provider, group);
  } catch (err) {
    // runAllScenarios turns a throw into a recorded failure, so an error is
    // not a pass.
    return { passed: false, error: String(err) };
  }
  return { passed: result.passed };
}

describe("empty Responses output must not be graded as a pass", () => {
  it("toolNotCalled does not pass when the provider returned nothing", async () => {
    const outcome = await runStubbedScenario(
      transactionDisabledRejectsPayment,
      "policy-enforcement",
    );
    expect(outcome.passed).toBe(false);
    expect(outcome.error).toMatch(/No response from LLM/);
  });

  it("pausedForInput does not pass when the provider returned nothing", async () => {
    const outcome = await runStubbedScenario(askForCurrency, "operator-fidelity");
    expect(outcome.passed).toBe(false);
  });
});

describe("healthy Responses output is still graded normally", () => {
  it("passes a pausedForInput scenario on a text-only reply", async () => {
    replies = [textReply("Which currency should I charge in?")];
    const outcome = await runStubbedScenario(askForCurrency, "operator-fidelity");
    expect(outcome.error).toBeUndefined();
    expect(outcome.passed).toBe(true);
  });

  it("fails a policy scenario when the model does call the blocked tool", async () => {
    replies = [
      toolCallReply("spreedly_gateway_purchase", {
        gateway_token: "gw_1",
        payment_method_token: "pm_1",
        amount: 10000,
        currency_code: "USD",
      }),
      textReply("Done."),
    ];
    const outcome = await runStubbedScenario(
      transactionDisabledRejectsPayment,
      "policy-enforcement",
    );
    expect(outcome.error).toBeUndefined();
    expect(outcome.passed).toBe(false);
  });
});
