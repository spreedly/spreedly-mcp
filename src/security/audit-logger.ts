import { randomUUID } from "node:crypto";
import { SpreedlyError } from "../transport/errors.js";

/** Number of characters extracted from the environment key for audit log identification. */
export const ENV_KEY_PREFIX_LENGTH = 6;

/**
 * Minimum acceptable length for SPREEDLY_ENVIRONMENT_KEY. Ensures the
 * {@link ENV_KEY_PREFIX_LENGTH}-char prefix never reveals more than half the key.
 */
export const MIN_ENV_KEY_LENGTH = 12;

/**
 * Structured audit log entry conforming to PCI DSS v4.0.1 Requirement 10.2.2.
 * Each field maps to a required audit attribute: user identification, event type,
 * date/time, success/failure, origination, and affected resource.
 */
interface AuditEntry {
  timestamp: string;
  idempotencyKey: string;
  component: "spreedly-mcp";
  tool: string;
  envKeyPrefix: string;
  status: "success" | "error";
  durationMs: number;
  errorCode?: string;
  statusCode?: number;
}

/**
 * Validates that the environment key meets the minimum length requirement and
 * returns a truncated prefix safe for logging.
 *
 * Called once at startup in bin.ts. The returned prefix is stored on the server
 * context and reused for every audit log entry — it is never recomputed.
 *
 * @param environmentKey - The full SPREEDLY_ENVIRONMENT_KEY value.
 * @returns The first {@link ENV_KEY_PREFIX_LENGTH} characters of the key.
 * @throws {Error} If the key is shorter than {@link MIN_ENV_KEY_LENGTH} characters,
 *   with a message that includes the actual length and a link to Spreedly docs.
 */
export function validateAndExtractPrefix(environmentKey: string): string {
  if (environmentKey.length < MIN_ENV_KEY_LENGTH) {
    throw new Error(
      `SPREEDLY_ENVIRONMENT_KEY appears invalid: must be at least ${MIN_ENV_KEY_LENGTH} characters ` +
        `(got ${environmentKey.length}). Verify your key at https://docs.spreedly.com/basics/credentials/`,
    );
  }
  return environmentKey.slice(0, ENV_KEY_PREFIX_LENGTH);
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
 * @param envKeyPrefix - The truncated environment key prefix for user identification.
 * @param startTime - The `Date.now()` timestamp captured before handler execution.
 * @param error - The caught error, if the tool invocation failed.
 */
export function emitAuditEvent(
  toolName: string,
  envKeyPrefix: string,
  startTime: number,
  error?: unknown,
): void {
  try {
    const entry = buildAuditEntry(toolName, envKeyPrefix, startTime, error);
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
 * Each entry receives a unique {@link AuditEntry.idempotencyKey | idempotencyKey}
 * (UUIDv4) so that downstream consumers can de-duplicate entries when an MCP host
 * renders stderr output more than once.
 *
 * Classifies errors into three categories:
 * - {@link SpreedlyError}: uses the error's `code` and `statusCode` directly.
 * - Standard `Error`: classified as `"INTERNAL_ERROR"`.
 * - Non-Error values: classified as `"UNKNOWN_ERROR"`.
 *
 * @param toolName - The MCP tool name.
 * @param envKeyPrefix - The truncated environment key prefix.
 * @param startTime - The `Date.now()` timestamp captured before handler execution.
 * @param error - The caught error, if any.
 * @returns A fully populated audit entry ready for serialization.
 */
function buildAuditEntry(
  toolName: string,
  envKeyPrefix: string,
  startTime: number,
  error?: unknown,
): AuditEntry {
  const entry: AuditEntry = {
    timestamp: new Date().toISOString(),
    idempotencyKey: randomUUID(),
    component: "spreedly-mcp",
    tool: toolName,
    envKeyPrefix,
    status: error ? "error" : "success",
    durationMs: Date.now() - startTime,
  };

  if (error instanceof SpreedlyError) {
    entry.errorCode = error.code;
    if (error.statusCode !== undefined) {
      entry.statusCode = error.statusCode;
    }
  } else if (error instanceof Error) {
    entry.errorCode = "INTERNAL_ERROR";
  } else if (error !== undefined) {
    entry.errorCode = "UNKNOWN_ERROR";
  }

  return entry;
}
