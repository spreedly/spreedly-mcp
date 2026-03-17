import type { SpreedlyTransport } from "../transport/types.js";
import {
  SpreedlyError,
  SpreedlyPaymentError,
  SpreedlyRateLimitError,
  SpreedlyValidationError,
} from "../transport/errors.js";
import { sanitizeParams, redactSensitiveValues } from "./sanitizer.js";
import { emitAuditEvent } from "./audit-logger.js";
import { ZodError } from "zod";

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

export type ErrorParser = (error: SpreedlyError) => Record<string, unknown>;

export function wrapHandler<TParams extends Record<string, unknown>>(
  toolName: string,
  handler: ToolHandler<TParams, unknown>,
  validate: (raw: unknown) => TParams,
  options?: { silent?: boolean; parseError?: ErrorParser },
): (raw: unknown, ctx: ToolContext) => Promise<McpToolResult> {
  const audit = !options?.silent;
  const errorParser = options?.parseError;
  return async (raw: unknown, ctx: ToolContext): Promise<McpToolResult> => {
    const startTime = Date.now();
    const { transport: tracked, getHttpContext } = withHttpTracking(ctx.transport);
    try {
      const rawParams = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
      const sanitized = sanitizeParams(rawParams);
      const validated = validate(sanitized);
      const result = await handler(validated, { ...ctx, transport: tracked });

      const httpCtx = getHttpContext();
      const durationMs = Date.now() - startTime;

      if (audit) emitAuditEvent(toolName, ctx.environmentKey, startTime, undefined, httpCtx);

      return toToolResult(result, httpCtx, durationMs);
    } catch (error) {
      const httpCtx = getHttpContext();
      const durationMs = Date.now() - startTime;

      if (error instanceof SpreedlyError) {
        if (!httpCtx.requestId && error.requestId) httpCtx.requestId = error.requestId;
        if (httpCtx.httpStatusCode === undefined) httpCtx.httpStatusCode = error.statusCode;
      }

      if (audit) emitAuditEvent(toolName, ctx.environmentKey, startTime, error, httpCtx);

      const errorObj = buildErrorObject(error, errorParser);
      return toToolResult(errorObj, httpCtx, durationMs, true);
    }
  };
}

/**
 * Wraps a transport to capture HTTP metadata (`x-request-id` and status code)
 * from the most recent Spreedly API call. Works on both success and error paths —
 * when the transport throws a {@link SpreedlyError}, the wrapper reads
 * `error.requestId` and `error.statusCode`.
 */
function withHttpTracking(transport: SpreedlyTransport) {
  let lastRequestId: string | undefined;
  let lastHttpStatusCode: number | undefined;
  const tracked: SpreedlyTransport = Object.freeze({
    async request<T>(...args: Parameters<SpreedlyTransport["request"]>) {
      try {
        const response = await transport.request<T>(...args);
        lastRequestId = response.headers[REQUEST_ID_HEADER];
        lastHttpStatusCode = response.status;
        return response;
      } catch (error) {
        if (error instanceof SpreedlyError) {
          if (error.requestId) lastRequestId = error.requestId;
          if (error.statusCode !== undefined) lastHttpStatusCode = error.statusCode;
        }
        throw error;
      }
    },
  });
  return {
    transport: tracked,
    getHttpContext: () => ({ requestId: lastRequestId, httpStatusCode: lastHttpStatusCode }),
  };
}

function toToolResult(
  payload: unknown,
  httpCtx: { requestId?: string; httpStatusCode?: number },
  durationMs: number,
  isError?: boolean,
): McpToolResult {
  const metadata: Record<string, unknown> = { durationMs };
  if (httpCtx.httpStatusCode !== undefined) metadata.httpStatusCode = httpCtx.httpStatusCode;
  if (httpCtx.requestId) metadata.requestId = httpCtx.requestId;

  const base =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : { data: payload };

  const output = { ...base, _metadata: metadata };
  const text = JSON.stringify(redactSensitiveValues(output), null, 2);
  return { content: [{ type: "text", text }], ...(isError && { isError: true }) };
}

function defaultParseError(error: SpreedlyError): Record<string, unknown> {
  const details: Record<string, unknown> = {};
  if (error instanceof SpreedlyPaymentError && error.transactionToken) {
    details.transactionToken = error.transactionToken;
  }
  if (error instanceof SpreedlyRateLimitError && error.retryAfterMs) {
    details.retryAfterMs = error.retryAfterMs;
  }
  if (error instanceof SpreedlyValidationError && Object.keys(error.fieldErrors).length > 0) {
    details.fieldErrors = error.fieldErrors;
  }
  return details;
}

function buildErrorObject(
  error: unknown,
  errorParser?: ErrorParser,
): { error: Record<string, unknown> } {
  if (error instanceof SpreedlyError) {
    const parsed = errorParser ? errorParser(error) : defaultParseError(error);
    return {
      error: {
        httpStatusCode: error.statusCode ?? null,
        message: error.message,
        ...(error.errorType && error.statusCode === undefined && { errorType: error.errorType }),
        ...parsed,
      },
    };
  }

  if (error instanceof ZodError) {
    const messages = error.issues.map((i) => `${i.path.join(".")}: ${i.message}`);
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join(".") || "_root";
      (fieldErrors[key] ??= []).push(issue.message);
    }
    return {
      error: {
        httpStatusCode: null,
        message: messages.join("; "),
        fieldErrors,
      },
    };
  }

  if (error instanceof Error) {
    return { error: { httpStatusCode: null, message: error.message } };
  }

  return { error: { httpStatusCode: null, message: "An unexpected error occurred." } };
}
