import type { SpreedlyTransport } from "../transport/types.js";
import { SpreedlyError } from "../transport/errors.js";
import { sanitizeParams, redactCredentials } from "./sanitizer.js";
import { emitAuditEvent } from "./audit-logger.js";

const REQUEST_ID_HEADER = "x-request-id";

export interface ToolContext {
  transport: SpreedlyTransport;
  environmentKey: string;
}

export type ToolHandler<TParams, TResult> = (params: TParams, ctx: ToolContext) => Promise<TResult>;

export interface McpToolResult {
  [key: string]: unknown;
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export function wrapHandler<TParams extends Record<string, unknown>>(
  toolName: string,
  handler: ToolHandler<TParams, unknown>,
  validate: (raw: unknown) => TParams,
): (raw: unknown, ctx: ToolContext) => Promise<McpToolResult> {
  return async (raw: unknown, ctx: ToolContext): Promise<McpToolResult> => {
    const startTime = Date.now();
    const { transport: tracked, getLastRequestId } = withRequestIdTracking(ctx.transport);
    try {
      const rawParams = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const sanitized = sanitizeParams(rawParams);
      const validated = validate(sanitized);
      const result = await handler(validated, { ...ctx, transport: tracked });
      const text = typeof result === "string" ? result : JSON.stringify(result, null, 2);
      emitAuditEvent(toolName, ctx.environmentKey, startTime, undefined, getLastRequestId());
      return { content: [{ type: "text", text }] };
    } catch (error) {
      const requestId =
        getLastRequestId() ?? (error instanceof SpreedlyError ? error.requestId : undefined);
      emitAuditEvent(toolName, ctx.environmentKey, startTime, error, requestId);
      return formatError(error);
    }
  };
}

/**
 * Wraps a transport to capture the `x-request-id` response header from the
 * most recent Spreedly API call. Works on both success and error paths —
 * when the transport throws a {@link SpreedlyError}, the wrapper reads
 * `error.requestId` (set by {@link mapHttpStatusToError}).
 */
function withRequestIdTracking(transport: SpreedlyTransport) {
  let lastRequestId: string | undefined;
  const tracked: SpreedlyTransport = Object.freeze({
    async request<T>(...args: Parameters<SpreedlyTransport["request"]>) {
      try {
        const response = await transport.request<T>(...args);
        lastRequestId = response.headers[REQUEST_ID_HEADER];
        return response;
      } catch (error) {
        if (error instanceof SpreedlyError && error.requestId) {
          lastRequestId = error.requestId;
        }
        throw error;
      }
    },
  });
  return { transport: tracked, getLastRequestId: () => lastRequestId };
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
