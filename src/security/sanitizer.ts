/* eslint-disable no-control-regex -- intentionally matching control and invisible characters for security sanitization */
const INVISIBLE_CHARS =
  /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u00AD\u200B-\u200F\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\uFEFF]/g;
/* eslint-enable no-control-regex */

const MCP_PROTOCOL_FRAGMENTS = [
  "tool_call",
  "<|im_start|>",
  "<|im_end|>",
  "```system",
  "SYSTEM:",
  "ASSISTANT:",
  "USER:",
  "<tool_call>",
  "</tool_call>",
];

const TOKEN_PATTERN = /^[a-zA-Z0-9_-]+$/;

const MAX_FIELD_LENGTHS: Record<string, number> = {
  identifier: 64,
  default: 10_000,
};

const STRICT_IDENTIFIER_FIELDS = new Set([
  "token",
  "gateway_token",
  "payment_method_token",
  "transaction_token",
  "merchant_profile_token",
  "merchant_profile_key",
  "certificate_token",
  "protection_provider_token",
  "sca_provider_token",
  "sca_provider_key",
  "event_token",
  "event_id",
  "inquiry_token",
  "since_token",
  "environment_key",
  "sub_merchant_key",
]);

function createSafeRecord(): Record<string, unknown> {
  return Object.create(null) as Record<string, unknown>;
}

function isStrictIdentifierField(fieldName?: string): boolean {
  return fieldName !== undefined && STRICT_IDENTIFIER_FIELDS.has(fieldName);
}

export function sanitizeString(value: string, fieldName?: string): string {
  let cleaned = value.normalize("NFKC");
  cleaned = cleaned.replace(INVISIBLE_CHARS, "");
  cleaned = cleaned.trim();

  const maxLen = isStrictIdentifierField(fieldName)
    ? MAX_FIELD_LENGTHS.identifier
    : MAX_FIELD_LENGTHS.default;

  if (cleaned.length > maxLen) {
    cleaned = cleaned.slice(0, maxLen);
  }

  return cleaned;
}

export function containsInjectionAttempt(value: string): boolean {
  const lower = value.toLowerCase();
  return MCP_PROTOCOL_FRAGMENTS.some((frag) => lower.includes(frag.toLowerCase()));
}

export function isValidTokenFormat(value: string): boolean {
  return TOKEN_PATTERN.test(value) && value.length > 0 && value.length <= 64;
}

function assertValidIdentifierFormat(value: string, fieldName: string, inArray = false): void {
  if (!isStrictIdentifierField(fieldName) || isValidTokenFormat(value)) {
    return;
  }

  // Keep field-aware identifier policy at the shared input boundary. URL builders
  // only encode already-sanitized values; they do not know whether a given param
  // is meant to be a strict Spreedly identifier.
  const location = inArray ? "array field" : "field";
  throw new Error(`Invalid identifier format in ${location} "${fieldName}".`);
}

/**
 * Recursively sanitizes tool arguments before schema validation and handler
 * execution. `wrapHandler()` calls this for every registered tool invocation,
 * so this is the shared boundary for trimming strings, stripping invisible
 * characters, blocking prompt-injection fragments, and enforcing strict
 * identifier formats before params are reshaped into URLs or request bodies.
 */
export function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const result = createSafeRecord();

  for (const [key, value] of Object.entries(params)) {
    const sanitizedKey = sanitizeString(key);
    if (containsInjectionAttempt(sanitizedKey)) {
      throw new Error(`Invalid input detected in key "${key}".`);
    }

    if (typeof value === "string") {
      const sanitized = sanitizeString(value, key);
      if (containsInjectionAttempt(sanitized)) {
        throw new Error(`Invalid input detected in field "${key}".`);
      }
      assertValidIdentifierFormat(sanitized, key);
      result[key] = sanitized;
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === "string") {
          const sanitized = sanitizeString(item, key);
          if (containsInjectionAttempt(sanitized)) {
            throw new Error(`Invalid input detected in array field "${key}".`);
          }
          assertValidIdentifierFormat(sanitized, key, true);
          return sanitized;
        }
        if (item !== null && typeof item === "object") {
          return sanitizeParams(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (value !== null && typeof value === "object") {
      result[key] = sanitizeParams(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result;
}

const CREDENTIAL_PATTERNS = [
  /Basic\s+[A-Za-z0-9+/=]+/g,
  /Bearer\s+[A-Za-z0-9._-]+/g,
  /[A-Za-z0-9+/]{20,}={0,2}/g,
];

/**
 * Spreedly resource identifiers that are safe to preserve in agent-facing
 * output. Keep this as an explicit allowlist rather than a pattern so
 * credential-shaped fields like `api_key` or `private_key` are still redacted.
 */
const SAFE_IDENTIFIER_FIELDS = new Set([
  "token",
  "gateway_token",
  "payment_method_token",
  "transaction_token",
  "transactionToken",
  "merchant_profile_token",
  "certificate_token",
  "protection_provider_token",
  "sca_provider_token",
  "sca_provider_key",
  "event_token",
  "inquiry_token",
  "since_token",
  "environment_key",
  "sub_merchant_key",
  "requestId",
  "eventId",
]);

function isSafeIdentifierField(fieldName: string): boolean {
  return SAFE_IDENTIFIER_FIELDS.has(fieldName);
}

function redactString(value: string): string {
  let result = value;
  for (const pattern of CREDENTIAL_PATTERNS) {
    result = result.replace(new RegExp(pattern.source, pattern.flags), "[REDACTED]");
  }
  return result;
}

/**
 * Recursively redacts credential-like values in an object, preserving values
 * in known-safe identifier fields (tokens, keys). The aggressive catch-all
 * regex acts as a safety net for any non-identifier field that contains a
 * credential-looking string. `toToolResult()` uses this before serializing
 * agent-facing success/error payloads, so transports and handlers can return
 * raw API data without leaking secrets into MCP responses.
 */
export function redactSensitiveValues(value: unknown, fieldName?: string): unknown {
  if (value === null || value === undefined) return value;

  if (typeof value === "string") {
    return fieldName && isSafeIdentifierField(fieldName) ? value : redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSensitiveValues(item, fieldName));
  }

  if (typeof value === "object") {
    const result = createSafeRecord();
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = redactSensitiveValues(val, key);
    }
    return result;
  }

  return value;
}
