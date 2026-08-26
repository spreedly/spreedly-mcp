import OpenAI from "openai";
import type { ReasoningEffort } from "openai/resources/shared.js";
import type {
  FunctionTool,
  ResponseFunctionToolCall,
  ResponseInputItem,
  ResponseOutputItem,
} from "openai/resources/responses/responses.js";
import type { LLMProvider, LLMMessage, LLMToolCall, LLMToolDef } from "./types.js";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
export const DEFAULT_MODEL = "gpt-5.6-luna";
export const DEFAULT_REASONING_EFFORT: ReasoningEffort = "medium";

const REASONING_EFFORTS: readonly ReasoningEffort[] = [
  "none",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
];

export type EvalApi = "responses" | "chat.completions";

export function resolveEvalApi(
  baseURL: string = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL,
): EvalApi {
  try {
    return new URL(baseURL).hostname === "api.openai.com" ? "responses" : "chat.completions";
  } catch {
    return "chat.completions";
  }
}

export function resolveReasoningEffort(
  raw: string | undefined = process.env.EVAL_REASONING_EFFORT,
): ReasoningEffort {
  if (raw === undefined || raw === "") {
    return DEFAULT_REASONING_EFFORT;
  }
  if (isReasoningEffort(raw)) {
    return raw;
  }
  throw new Error(
    `Invalid EVAL_REASONING_EFFORT "${raw}". Use one of: ${REASONING_EFFORTS.join(", ")}`,
  );
}

function isReasoningEffort(value: string): value is ReasoningEffort {
  for (const effort of REASONING_EFFORTS) {
    if (effort === value) {
      return true;
    }
  }
  return false;
}

export function createProvider(model?: string): LLMProvider {
  const baseURL = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env or export it in your shell.");
  }
  const modelName = model || DEFAULT_MODEL;
  const client = new OpenAI({ baseURL, apiKey });
  const api = resolveEvalApi(baseURL);

  if (api === "responses") {
    const effort = resolveReasoningEffort();
    return responsesProvider(client, modelName, effort);
  }
  return chatCompletionsProvider(client, modelName);
}

function responsesProvider(
  client: OpenAI,
  modelName: string,
  effort: ReasoningEffort,
): LLMProvider {
  return {
    async chat(messages: LLMMessage[], tools: LLMToolDef[]): Promise<LLMMessage> {
      const response = await client.responses.create({
        model: modelName,
        input: messagesToResponseInput(messages),
        tools: tools.length > 0 ? tools.map(toResponseTool) : undefined,
        store: false,
        include: ["reasoning.encrypted_content"],
        reasoning: { effort },
      });
      return outputItemsToAssistantMessage(response.output);
    },
  };
}

function chatCompletionsProvider(client: OpenAI, modelName: string): LLMProvider {
  return {
    async chat(messages: LLMMessage[], tools: LLMToolDef[]): Promise<LLMMessage> {
      const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: modelName,
        messages: messages.map(toChatMessage),
        tools: tools.length > 0 ? tools.map(toChatTool) : undefined,
      };
      if (!modelName.startsWith("gpt-5")) {
        params.temperature = 0;
      }
      const response = await client.chat.completions.create(params);
      const choice = response.choices[0];
      if (!choice) {
        throw new Error("No response from LLM");
      }
      return chatChoiceToAssistantMessage(choice.message);
    },
  };
}

export function withThrottle(provider: LLMProvider, pauseMs: number): LLMProvider {
  let pending: Promise<void> = Promise.resolve();
  const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

  return {
    chat(messages, tools) {
      const next = pending.then(async () => {
        const result = await provider.chat(messages, tools);
        await sleep(pauseMs);
        return result;
      });
      pending = next.then(
        () => {},
        () => {},
      );
      return next;
    },
  };
}

export function messagesToResponseInput(messages: LLMMessage[]): ResponseInputItem[] {
  const items: ResponseInputItem[] = [];
  for (const msg of messages) {
    switch (msg.role) {
      case "system":
      case "user":
        items.push({ role: msg.role, content: msg.content, type: "message" });
        break;
      case "assistant":
        if (msg.responsesItems && msg.responsesItems.length > 0) {
          items.push(...replayableOutputItems(msg.responsesItems));
        } else if (msg.tool_calls && msg.tool_calls.length > 0) {
          items.push(...msg.tool_calls.map(toolCallToFunctionCallItem));
        } else {
          items.push({ role: "assistant", content: msg.content, type: "message" });
        }
        break;
      case "tool":
        items.push({
          type: "function_call_output",
          call_id: msg.tool_call_id || "",
          output: msg.content,
        });
        break;
      default: {
        const _exhaustive: never = msg.role;
        throw new Error(`Unhandled message role: ${String(_exhaustive)}`);
      }
    }
  }
  return items;
}

export function outputItemsToAssistantMessage(output: ResponseOutputItem[]): LLMMessage {
  const texts: string[] = [];
  const toolCalls: LLMToolCall[] = [];

  for (const item of output) {
    if (item.type === "message") {
      for (const part of item.content) {
        if (part.type === "output_text") {
          texts.push(part.text);
        }
      }
      continue;
    }
    if (item.type === "function_call") {
      toolCalls.push({
        id: item.call_id,
        type: "function",
        function: {
          name: item.name,
          arguments: item.arguments,
        },
      });
    }
  }

  const result: LLMMessage = {
    role: "assistant",
    content: texts.join("\n"),
    responsesItems: output,
  };
  if (toolCalls.length > 0) {
    result.tool_calls = toolCalls;
  }
  return result;
}

function replayableOutputItems(output: ResponseOutputItem[]): ResponseInputItem[] {
  const items: ResponseInputItem[] = [];
  for (const item of output) {
    if (item.type === "reasoning" || item.type === "function_call" || item.type === "message") {
      items.push(item);
    }
  }
  return items;
}

function toolCallToFunctionCallItem(tc: LLMToolCall): ResponseFunctionToolCall {
  return {
    type: "function_call",
    call_id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  };
}

function toResponseTool(tool: LLMToolDef): FunctionTool {
  return {
    type: "function",
    name: tool.function.name,
    description: tool.function.description,
    parameters: tool.function.parameters,
    strict: false,
  };
}

function toChatMessage(msg: LLMMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
  if (msg.role === "tool") {
    return {
      role: "tool",
      content: msg.content,
      tool_call_id: msg.tool_call_id || "",
    };
  }

  if (msg.role === "assistant" && msg.tool_calls) {
    return {
      role: "assistant",
      content: msg.content || null,
      tool_calls: msg.tool_calls.map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      })),
    };
  }

  return {
    role: msg.role as "system" | "user" | "assistant",
    content: msg.content,
  };
}

function toChatTool(tool: LLMToolDef): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters as OpenAI.FunctionParameters,
    },
  };
}

function chatChoiceToAssistantMessage(
  msg: OpenAI.Chat.Completions.ChatCompletionMessage,
): LLMMessage {
  const result: LLMMessage = {
    role: "assistant",
    content: msg.content || "",
  };

  if (msg.tool_calls && msg.tool_calls.length > 0) {
    result.tool_calls = msg.tool_calls
      .filter(
        (tc): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: "function" } =>
          tc.type === "function",
      )
      .map((tc) => ({
        id: tc.id,
        type: "function" as const,
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));
  }

  return result;
}
