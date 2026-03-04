export class SpreedlyError extends Error {
  readonly code: string;
  readonly statusCode?: number;

  constructor(message: string, code: string, statusCode?: number) {
    super(message);
    this.name = "SpreedlyError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class SpreedlyAuthError extends SpreedlyError {
  constructor(message = "Authentication failed. Verify your SPREEDLY_ENVIRONMENT_KEY and SPREEDLY_ACCESS_SECRET are correct.") {
    super(message, "AUTH_ERROR", 401);
    this.name = "SpreedlyAuthError";
  }
}

export class SpreedlyForbiddenError extends SpreedlyError {
  constructor(message = "Access denied. Your credentials do not have permission for this operation.") {
    super(message, "FORBIDDEN", 403);
    this.name = "SpreedlyForbiddenError";
  }
}

export class SpreedlyNotFoundError extends SpreedlyError {
  constructor(resource?: string) {
    const msg = resource
      ? `Resource not found: ${resource}`
      : "The requested resource was not found.";
    super(msg, "NOT_FOUND", 404);
    this.name = "SpreedlyNotFoundError";
  }
}

export class SpreedlyValidationError extends SpreedlyError {
  readonly fieldErrors: Record<string, string[]>;

  constructor(message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message, "VALIDATION_ERROR", 422);
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
    super(msg, "RATE_LIMITED", 429);
    this.name = "SpreedlyRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export class SpreedlyGatewayError extends SpreedlyError {
  constructor(statusCode: number) {
    super(
      "Spreedly API is temporarily unavailable. Please try again shortly.",
      "GATEWAY_ERROR",
      statusCode,
    );
    this.name = "SpreedlyGatewayError";
  }
}

export class SpreedlyPaymentError extends SpreedlyError {
  readonly transactionToken?: string;

  constructor(message: string, transactionToken?: string) {
    super(message, "PAYMENT_ERROR", 402);
    this.name = "SpreedlyPaymentError";
    this.transactionToken = transactionToken;
  }
}

export function mapHttpStatusToError(status: number, body: unknown): SpreedlyError {
  const message = extractErrorMessage(body);

  switch (status) {
    case 401:
      return new SpreedlyAuthError();
    case 402:
      return new SpreedlyPaymentError(message || "Payment required.");
    case 403:
      return new SpreedlyForbiddenError();
    case 404:
      return new SpreedlyNotFoundError();
    case 408:
      return new SpreedlyError("Request timed out.", "TIMEOUT", 408);
    case 422:
      return new SpreedlyValidationError(
        message || "Validation failed.",
        extractFieldErrors(body),
      );
    case 429: {
      return new SpreedlyRateLimitError();
    }
    case 502:
    case 503:
    case 504:
      return new SpreedlyGatewayError(status);
    default:
      return new SpreedlyError(
        message || `Unexpected API response (HTTP ${status}).`,
        "API_ERROR",
        status,
      );
  }
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
          if (e && typeof e === "object" && typeof (e as Record<string, unknown>).message === "string") {
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
  if (body && typeof body === "object") {
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
  }
  return {};
}
