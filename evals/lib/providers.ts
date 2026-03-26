import OpenAI from "openai";
import type { LLMProvider, LLMMessage, LLMToolDef } from "./types.js";

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-5.4-nano";

export function createProvider(model?: string): LLMProvider {
  const baseURL = process.env.OPENAI_BASE_URL || DEFAULT_BASE_URL;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env or export it in your shell.");
  }
  const modelName = model || DEFAULT_MODEL;

  const client = new OpenAI({ baseURL, apiKey });

  return {
    async chat(messages: LLMMessage[], tools: LLMToolDef[]): Promise<LLMMessage> {
      const params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming = {
        model: modelName,
        messages: messages.map(convertMessage),
        tools: tools.length > 0 ? tools.map(convertTool) : undefined,
      };
      if (!modelName.startsWith("gpt-5")) {
        params.temperature = 0;
      }
      const response = await client.chat.completions.create(params);

      const choice = response.choices[0];
      if (!choice) {
        throw new Error("No response from LLM");
      }

      const msg = choice.message;
      const result: LLMMessage = {
        role: "assistant",
        content: msg.content || "",
      };

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        result.tool_calls = msg.tool_calls
          .filter(
            (
              tc,
            ): tc is OpenAI.Chat.Completions.ChatCompletionMessageToolCall & { type: "function" } =>
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

function convertMessage(msg: LLMMessage): OpenAI.Chat.Completions.ChatCompletionMessageParam {
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

function convertTool(tool: LLMToolDef): OpenAI.Chat.Completions.ChatCompletionTool {
  return {
    type: "function",
    function: {
      name: tool.function.name,
      description: tool.function.description,
      parameters: tool.function.parameters as OpenAI.FunctionParameters,
    },
  };
}
