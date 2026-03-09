import { randomUUID } from "node:crypto";
import { SpreedlyError } from "../transport/errors.js";

/**
 * Structured audit log entry conforming to PCI DSS v4.0.1 Requirement 10.2.2.
 * Each field maps to a required audit attribute: user identification, event type,
 * date/time, success/failure, origination, and affected resource.
 */
interface AuditEntry {
  /** ISO-8601 timestamp of when the audit entry was created. */
  timestamp: string;
  /** UUIDv4 unique to this entry, for downstream de-duplication. */
  eventId: string;
  component: "spreedly-mcp";
  /** The MCP tool that was invoked (e.g. `"spreedly_gateway_authorize"`). */
  tool: string;
  /** The full SPREEDLY_ENVIRONMENT_KEY (not a secret — safe to log). */
  environmentKey: string;
  /**
   * `"success"` when the tool handler completed without throwing;
   * `"error"` when any exception was caught (API failure, validation
   * rejection, sanitization block, or unexpected throw).
   */
  status: "success" | "error";
  /** Wall-clock milliseconds from handler start to audit entry creation. */
  durationMs: number;
  /** The `x-request-id` HTTP response header from the Spreedly API, if a request was made. */
  requestId?: string;
  /**
   * MCP-level error classification. Derived from {@link SpreedlyError.code}
   * for API errors (e.g. `"AUTH_ERROR"`, `"VALIDATION_ERROR"`), or set to
   * `"INTERNAL_ERROR"` / `"UNKNOWN_ERROR"` for non-API failures.
   * Absent on success.
   */
  errorCode?: string;
  /**
   * The HTTP status code from the Spreedly API response (e.g. 401, 422, 502).
   * Only present when the error originated from an HTTP response.
   * Absent for non-HTTP errors and on success.
   */
  httpStatusCode?: number;
}

/**
 * Builds an audit entry and writes it to stderr as a single JSON line.
 *
 * This is the primary entry point for audit logging from the middleware.
 * It is guaranteed to never throw. Audit logging must not interfere with
 * tool execution — if an action succeeded (e.g., an authorization was
 * placed), the caller must always receive the result even if building
 * or writing the log entry fails.
 *
 * Respects `SPREEDLY_MCP_LOG_LEVEL`: set to `"silent"` to suppress output.
 * Defaults to `"info"` (logging enabled).
 *
 * @param toolName - The MCP tool name (e.g., `"spreedly_gateway_authorize"`).
 * @param environmentKey - The SPREEDLY_ENVIRONMENT_KEY for user identification.
 * @param startTime - The `Date.now()` timestamp captured before handler execution.
 * @param error - The caught error, if the tool invocation failed.
 * @param requestId - The `x-request-id` response header from the last Spreedly API call, if available.
 */
export function emitAuditEvent(
  toolName: string,
  environmentKey: string,
  startTime: number,
  error?: unknown,
  requestId?: string,
): void {
  try {
    const entry = buildAuditEntry(toolName, environmentKey, startTime, error, requestId);
    if ((process.env.SPREEDLY_MCP_LOG_LEVEL ?? "info").toLowerCase() === "silent") return;
    process.stderr.write(JSON.stringify(entry) + "\n");
  } catch {
    try {
      process.stderr.write(`{"component":"spreedly-mcp","error":"audit_log_write_failed"}\n`);
    } catch {
      // Exhausted all options — silently discard to protect tool execution.
    }
  }
}

/**
 * Constructs a structured {@link AuditEntry} from the tool invocation context.
 *
 * Each entry receives a unique {@link AuditEntry.eventId | eventId}
 * (UUIDv4) so that downstream consumers can de-duplicate entries when an MCP host
 * renders stderr output more than once.
 *
 * Classifies errors into three categories:
 * - {@link SpreedlyError}: uses the error's `code` and `statusCode` directly.
 * - Standard `Error`: classified as `"INTERNAL_ERROR"`.
 * - Non-Error values: classified as `"UNKNOWN_ERROR"`.
 *
 * @param toolName - The MCP tool name.
 * @param environmentKey - The SPREEDLY_ENVIRONMENT_KEY.
 * @param startTime - The `Date.now()` timestamp captured before handler execution.
 * @param error - The caught error, if any.
 * @param requestId - The `x-request-id` response header, if available.
 * @returns A fully populated audit entry ready for serialization.
 */
function buildAuditEntry(
  toolName: string,
  environmentKey: string,
  startTime: number,
  error?: unknown,
  requestId?: string,
): AuditEntry {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    eventId: randomUUID(),
    component: "spreedly-mcp",
    tool: toolName,
    environmentKey,
    status: error !== undefined ? "error" : "success",
    durationMs: Date.now() - startTime,
  };

  if (requestId) {
    entry.requestId = requestId;
  }

  if (error instanceof SpreedlyError) {
    entry.errorCode = error.code;
    if (error.statusCode !== undefined) {
      entry.httpStatusCode = error.statusCode;
    }
  } else if (error instanceof Error) {
    entry.errorCode = "INTERNAL_ERROR";
  } else if (error !== undefined) {
    entry.errorCode = "UNKNOWN_ERROR";
  }

  return entry;
}
