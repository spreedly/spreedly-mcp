import { randomUUID } from "node:crypto";

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
   * The HTTP status code from the Spreedly API response (e.g. 200, 401, 422).
   * Present whenever a Spreedly API call was made, regardless of success or failure.
   * `null` when an error occurred before any HTTP request (e.g. validation rejection).
   * Absent on success when no HTTP request was made.
   */
  httpStatusCode?: number | null;
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
 * @param httpContext - Optional HTTP context from the last Spreedly API call.
 */
export function emitAuditEvent(
  toolName: string,
  environmentKey: string,
  startTime: number,
  error?: unknown,
  httpContext?: { requestId?: string; httpStatusCode?: number },
): void {
  try {
    const entry = buildAuditEntry(toolName, environmentKey, startTime, error, httpContext);
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
 * Sets `httpStatusCode` from the HTTP context when available.
 * On error, when no HTTP request was made (e.g. validation rejection),
 * `httpStatusCode` is set to `null` to distinguish from success paths
 * where no API call occurred (field absent).
 *
 * @param toolName - The MCP tool name.
 * @param environmentKey - The SPREEDLY_ENVIRONMENT_KEY.
 * @param startTime - The `Date.now()` timestamp captured before handler execution.
 * @param error - The caught error, if any.
 * @param httpContext - Optional HTTP context from the last Spreedly API call.
 * @returns A fully populated audit entry ready for serialization.
 */
function buildAuditEntry(
  toolName: string,
  environmentKey: string,
  startTime: number,
  error?: unknown,
  httpContext?: { requestId?: string; httpStatusCode?: number },
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

  if (httpContext?.requestId) {
    entry.requestId = httpContext.requestId;
  }
  if (httpContext?.httpStatusCode !== undefined) {
    entry.httpStatusCode = httpContext.httpStatusCode;
  } else if (error !== undefined) {
    entry.httpStatusCode = null;
  }

  return entry;
}
