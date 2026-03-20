export class SpreedlyError extends Error {
  readonly statusCode?: number;
  readonly errorType?: "timeout" | "network" | "internal";
  requestId?: string;
  responseBody?: unknown;

  constructor(
    message: string,
    statusCode?: number,
    errorType?: "timeout" | "network" | "internal",
  ) {
    super(message);
    this.name = "SpreedlyError";
    this.statusCode = statusCode;
    this.errorType = errorType;
  }
}

export class SpreedlyAuthError extends SpreedlyError {
  constructor(
    message = "Authentication failed. Verify your SPREEDLY_ENVIRONMENT_KEY and SPREEDLY_ACCESS_SECRET are correct.",
  ) {
    super(message, 401);
    this.name = "SpreedlyAuthError";
  }
}

export class SpreedlyForbiddenError extends SpreedlyError {
  constructor(
    message = "Access denied. Your credentials do not have permission for this operation.",
  ) {
    super(message, 403);
    this.name = "SpreedlyForbiddenError";
  }
}

export class SpreedlyNotFoundError extends SpreedlyError {
  constructor(resource?: string) {
    const msg = resource
      ? `Resource not found: ${resource}`
      : "The requested resource was not found.";
    super(msg, 404);
    this.name = "SpreedlyNotFoundError";
  }
}

export class SpreedlyValidationError extends SpreedlyError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message, 422);
    this.name = "SpreedlyValidationError";
    this.fieldErrors = fieldErrors;
  }
}

export class SpreedlyRateLimitError extends SpreedlyError {
  readonly retryAfterMs?: number;

  constructor(retryAfterMs?: number) {
    const msg = retryAfterMs
      ? `Rate limit exceeded. Retry after ${Math.ceil(retryAfterMs / 1000)} seconds.`
      : "Rate limit exceeded. Please slow down requests.";
    super(msg, 429);
    this.name = "SpreedlyRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class SpreedlyGatewayError extends SpreedlyError {
  constructor(statusCode: number) {
    super("Spreedly API is temporarily unavailable. Please try again shortly.", statusCode);
    this.name = "SpreedlyGatewayError";
  }
}

export class SpreedlyPaymentError extends SpreedlyError {
  readonly transactionToken?: string;

  constructor(message: string, transactionToken?: string) {
    super(message, 402);
    this.name = "SpreedlyPaymentError";
    this.transactionToken = transactionToken;
  }
}

export function mapHttpStatusToError(
  status: number,
  body: unknown,
  requestId?: string,
  headers?: Record<string, string>,
): SpreedlyError {
  const message = extractErrorMessage(body);

  let error: SpreedlyError;
  switch (status) {
    case 401:
      error = new SpreedlyAuthError();
      break;
    case 402:
      error = new SpreedlyPaymentError(
        message || "Payment required.",
        extractTransactionToken(body),
      );
      break;
    case 403:
      error = new SpreedlyForbiddenError();
      break;
    case 404:
      error = new SpreedlyNotFoundError();
      break;
    case 408:
      error = new SpreedlyError("Request timed out.", 408);
      break;
    case 422:
      error = new SpreedlyValidationError(
        message || "Validation failed.",
        extractFieldErrors(body),
      );
      break;
    case 429:
      error = new SpreedlyRateLimitError(parseRetryAfter(headers));
      break;
    case 502:
    case 503:
    case 504:
      error = new SpreedlyGatewayError(status);
      break;
    default:
      error = new SpreedlyError(message || `Unexpected API response (HTTP ${status}).`, status);
      break;
  }
  error.requestId = requestId;
  error.responseBody = body;
  return error;
}

function extractErrorMessage(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.message === "string") return obj.message;
    if (typeof obj.error === "string") return obj.error;
    if (Array.isArray(obj.errors)) {
      const messages = obj.errors
        .map((e: unknown) => {
          if (typeof e === "string") return e;
          if (
            e &&
            typeof e === "object" &&
            typeof (e as Record<string, unknown>).message === "string"
          ) {
            return (e as Record<string, unknown>).message as string;
          }
          return undefined;
        })
        .filter(Boolean);
      if (messages.length > 0) return messages.join("; ");
    }
  }
  return undefined;
}

function extractFieldErrors(body: unknown): Record<string, string[]> {
  if (!body || typeof body !== "object") return {};
  const obj = body as Record<string, unknown>;

  if (obj.errors && typeof obj.errors === "object" && !Array.isArray(obj.errors)) {
    const result: Record<string, string[]> = {};
    for (const [key, val] of Object.entries(obj.errors as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        result[key] = val.filter((v): v is string => typeof v === "string");
      }
    }
    return result;
  }

  if (Array.isArray(obj.errors)) {
    const result: Record<string, string[]> = {};
    for (const entry of obj.errors) {
      if (!entry || typeof entry !== "object") continue;
      const e = entry as Record<string, unknown>;
      const msg = typeof e.message === "string" ? e.message : undefined;
      if (!msg) continue;
      const field = deriveFieldName(e);
      (result[field] ??= []).push(msg);
    }
    return result;
  }

  return {};
}

function deriveFieldName(entry: Record<string, unknown>): string {
  if (typeof entry.attribute === "string" && entry.attribute.length > 0) {
    return entry.attribute;
  }
  if (typeof entry.key === "string") {
    const parts = entry.key.split(".");
    if (parts.length > 1) return parts.slice(1).join(".");
  }
  return "_base";
}

function extractTransactionToken(body: unknown): string | undefined {
  if (body && typeof body === "object") {
    const obj = body as Record<string, unknown>;
    if (typeof obj.transaction_token === "string") return obj.transaction_token;
  }
  return undefined;
}

function parseRetryAfter(headers?: Record<string, string>): number | undefined {
  const raw = headers?.["retry-after"];
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds > 0 ? seconds * 1000 : undefined;
}
