import { describe, it, expect, beforeEach } from "vitest";
import {
  assertResponseOutput,
  isOpenAIApiHost,
  messagesToResponseInput,
  outputItemsToAssistantMessage,
  resolveEvalApi,
  resolveReasoningEffort,
  responsesCreateExtras,
} from "../../evals/lib/providers.js";
import type { LLMMessage } from "../../evals/lib/types.js";
import type { ResponseOutputItem } from "openai/resources/responses/responses.js";

// resolveEvalApi()/resolveReasoningEffort() fall back to process.env when called
// with undefined, so clear both to assert the code defaults rather than ambient env.
beforeEach(() => {
  delete process.env.EVAL_API;
  delete process.env.EVAL_REASONING_EFFORT;
});

describe("resolveEvalApi", () => {
  it("defaults to responses", () => {
    expect(resolveEvalApi(undefined)).toBe("responses");
    expect(resolveEvalApi("")).toBe("responses");
  });

  it("accepts chat.completions", () => {
    expect(resolveEvalApi("chat.completions")).toBe("chat.completions");
  });

  it("rejects unknown values", () => {
    expect(() => resolveEvalApi("chat")).toThrow(/Invalid EVAL_API/);
  });
});

describe("isOpenAIApiHost", () => {
  it("detects api.openai.com", () => {
    expect(isOpenAIApiHost("https://api.openai.com/v1")).toBe(true);
  });

  it("does not treat local hosts as OpenAI", () => {
    expect(isOpenAIApiHost("http://localhost:11434/v1")).toBe(false);
  });
});

describe("responsesCreateExtras", () => {
  it("sends store:false only on non-OpenAI hosts", () => {
    expect(responsesCreateExtras(false, "medium")).toEqual({ store: false });
  });

  it("includes encrypted reasoning and effort on OpenAI", () => {
    expect(responsesCreateExtras(true, "low")).toEqual({
      store: false,
      include: ["reasoning.encrypted_content"],
      reasoning: { effort: "low" },
    });
  });
});

describe("resolveReasoningEffort", () => {
  it("defaults to medium", () => {
    expect(resolveReasoningEffort(undefined)).toBe("medium");
    expect(resolveReasoningEffort("")).toBe("medium");
  });

  it("rejects unknown values", () => {
    expect(() => resolveReasoningEffort("max")).toThrow(/Invalid EVAL_REASONING_EFFORT/);
  });
});

describe("messagesToResponseInput", () => {
  it("maps system and user messages", () => {
    const input = messagesToResponseInput([
      { role: "system", content: "instructions" },
      { role: "user", content: "purchase $5" },
    ]);
    expect(input).toEqual([
      { role: "system", content: "instructions", type: "message" },
      { role: "user", content: "purchase $5", type: "message" },
    ]);
  });

  it("replays prior output items then tool results", () => {
    const functionCall: ResponseOutputItem = {
      type: "function_call",
      call_id: "call_1",
      name: "spreedly_gateway_purchase",
      arguments: '{"amount":500}',
      id: "fc_1",
      status: "completed",
    };
    const reasoning: ResponseOutputItem = {
      type: "reasoning",
      id: "rs_1",
      summary: [],
      encrypted_content: "enc",
    };
    const assistant: LLMMessage = {
      role: "assistant",
      content: "",
      tool_calls: [
        {
          id: "call_1",
          type: "function",
          function: { name: "spreedly_gateway_purchase", arguments: '{"amount":500}' },
        },
      ],
      responsesItems: [reasoning, functionCall],
    };
    const tool: LLMMessage = {
      role: "tool",
      content: '{"ok":true}',
      tool_call_id: "call_1",
    };

    const input = messagesToResponseInput([assistant, tool]);
    expect(input[0]).toMatchObject({ type: "reasoning", id: "rs_1" });
    expect(input[1]).toMatchObject({ type: "function_call", call_id: "call_1" });
    expect(input[2]).toEqual({
      type: "function_call_output",
      call_id: "call_1",
      output: '{"ok":true}',
    });
  });
});

describe("outputItemsToAssistantMessage", () => {
  it("extracts text and function calls and keeps items for replay", () => {
    const output: ResponseOutputItem[] = [
      {
        type: "reasoning",
        id: "rs_1",
        summary: [],
      },
      {
        type: "function_call",
        call_id: "call_9",
        name: "spreedly_gateway_list",
        arguments: "{}",
        id: "fc_9",
        status: "completed",
      },
    ];
    const msg = outputItemsToAssistantMessage(output);
    expect(msg.tool_calls).toEqual([
      {
        id: "call_9",
        type: "function",
        function: { name: "spreedly_gateway_list", arguments: "{}" },
      },
    ]);
    expect(msg.responsesItems).toEqual(output);
  });
});

describe("assertResponseOutput", () => {
  const item: ResponseOutputItem = {
    type: "function_call",
    call_id: "call_1",
    name: "spreedly_gateway_list",
    arguments: "{}",
    id: "fc_1",
    status: "completed",
  };

  it("returns the output items when present", () => {
    expect(assertResponseOutput({ output: [item], status: "completed" })).toEqual([item]);
  });

  it("throws when the response carries no output items", () => {
    expect(() => assertResponseOutput({ output: [], status: "completed" })).toThrow(
      /no output items \(status=completed\)/,
    );
    expect(() => assertResponseOutput({})).toThrow(/status=unknown/);
  });

  it("surfaces why the response was incomplete", () => {
    expect(() =>
      assertResponseOutput({
        output: [],
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
      }),
    ).toThrow(/status=incomplete, incomplete_details.reason=max_output_tokens/);
  });

  it("surfaces a response error", () => {
    expect(() =>
      assertResponseOutput({
        output: [],
        status: "failed",
        error: { code: "server_error", message: "upstream exploded" },
      }),
    ).toThrow(/error=upstream exploded/);
  });
});

describe("outputItemsToAssistantMessage refusals", () => {
  it("keeps refusal text so a refusal is not reported as empty content", () => {
    const output: ResponseOutputItem[] = [
      {
        type: "message",
        id: "msg_1",
        role: "assistant",
        status: "completed",
        content: [{ type: "refusal", refusal: "I cannot help with that." }],
      },
    ];
    const msg = outputItemsToAssistantMessage(output);
    expect(msg.content).toBe("I cannot help with that.");
    expect(msg.tool_calls).toBeUndefined();
  });
});
