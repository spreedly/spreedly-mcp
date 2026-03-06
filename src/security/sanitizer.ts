// eslint-disable-next-line no-misleading-character-class -- intentionally matching individual invisible/control characters
const INVISIBLE_CHARS = /[\u200B\u200C\u200D\u200E\u200F\uFEFF\u2028\u2029\u202A-\u202E\u2060-\u2064\u2066-\u2069\u00AD]/g;

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
  token: 64,
  default: 10_000,
};

export function sanitizeString(value: string, fieldName?: string): string {
  let cleaned = value.replace(INVISIBLE_CHARS, "");
  cleaned = cleaned.trim();

  const maxLen = fieldName && fieldName.toLowerCase().includes("token")
    ? MAX_FIELD_LENGTHS.token
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

export function sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string") {
      const sanitized = sanitizeString(value, key);
      if (containsInjectionAttempt(sanitized)) {
        throw new Error(`Invalid input detected in field "${key}".`);
      }
      result[key] = sanitized;
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === "string") {
          const sanitized = sanitizeString(item, key);
          if (containsInjectionAttempt(sanitized)) {
            throw new Error(`Invalid input detected in array field "${key}".`);
          }
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

export function redactCredentials(text: string): string {
  return text
    .replace(/Basic\s+[A-Za-z0-9+/=]+/g, "Basic [REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/g, "Bearer [REDACTED]")
    .replace(/[A-Za-z0-9+/]{20,}={0,2}/g, "[REDACTED]");
}
