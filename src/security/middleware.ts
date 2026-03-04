import type { SpreedlyTransport } from "../transport/types.js";
import { SpreedlyError } from "../transport/errors.js";
import { sanitizeParams, redactCredentials } from "./sanitizer.js";

export interface ToolContext {
  transport: SpreedlyTransport;
}

export type ToolHandler<TParams, TResult> = (
  params: TParams,
  ctx: ToolContext,
) => Promise<TResult>;

export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function wrapHandler<TParams extends Record<string, unknown>>(
  handler: ToolHandler<TParams, unknown>,
  validate: (raw: unknown) => TParams,
): (raw: unknown, ctx: ToolContext) => Promise<McpToolResult> {
  return async (raw: unknown, ctx: ToolContext): Promise<McpToolResult> => {
    try {
      const rawParams = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const sanitized = sanitizeParams(rawParams);
      const validated = validate(sanitized);
      const result = await handler(validated, ctx);
      const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      return { content: [{ type: "text", text }] };
    } catch (error) {
      return formatError(error);
    }
  };
}

function formatError(error: unknown): McpToolResult {
  if (error instanceof SpreedlyError) {
    const parts = [`Error (${error.code}): ${error.message}`];
    if ("fieldErrors" in error) {
      const fe = (error as { fieldErrors: Record<string, string[]> }).fieldErrors;
      for (const [field, messages] of Object.entries(fe)) {
        parts.push(`  ${field}: ${messages.join(", ")}`);
      }
    }
    return {
      content: [{ type: "text", text: redactCredentials(parts.join("\n")) }],
      isError: true,
    };
  }

  if (error instanceof Error) {
    return {
      content: [{ type: "text", text: redactCredentials(`Error: ${error.message}`) }],
      isError: true,
    };
  }

  return {
    content: [{ type: "text", text: "An unexpected error occurred." }],
    isError: true,
  };
}
