import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  emitAuditEvent,
  validateAndExtractPrefix,
  ENV_KEY_PREFIX_LENGTH,
  MIN_ENV_KEY_LENGTH,
} from "../../src/security/audit-logger.js";
import { SpreedlyAuthError, SpreedlyValidationError } from "../../src/transport/errors.js";

describe("validateAndExtractPrefix", () => {
  it("returns first 6 characters for a valid key", () => {
    expect(validateAndExtractPrefix("Abc123XyzLongEnoughKey")).toBe("Abc123");
  });

  it("returns first 6 characters at the 12-char boundary", () => {
    const key = "123456789012";
    expect(key.length).toBe(MIN_ENV_KEY_LENGTH);
    expect(validateAndExtractPrefix(key)).toBe("123456");
  });

  it("throws for a key with 11 characters", () => {
    const key = "12345678901";
    expect(() => validateAndExtractPrefix(key)).toThrow(
      `must be at least ${MIN_ENV_KEY_LENGTH} characters (got 11)`,
    );
    expect(() => validateAndExtractPrefix(key)).toThrow(
      "https://docs.spreedly.com/basics/credentials/",
    );
  });

  it("throws for a key equal to the prefix length", () => {
    const key = "a".repeat(ENV_KEY_PREFIX_LENGTH);
    expect(() => validateAndExtractPrefix(key)).toThrow(
      `must be at least ${MIN_ENV_KEY_LENGTH} characters (got ${ENV_KEY_PREFIX_LENGTH})`,
    );
  });

  it("throws for an empty string", () => {
    expect(() => validateAndExtractPrefix("")).toThrow(
      `must be at least ${MIN_ENV_KEY_LENGTH} characters (got 0)`,
    );
  });
});

describe("emitAuditEvent", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  const originalEnv = process.env.SPREEDLY_MCP_LOG_LEVEL;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
    delete process.env.SPREEDLY_MCP_LOG_LEVEL;
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    if (originalEnv === undefined) {
      delete process.env.SPREEDLY_MCP_LOG_LEVEL;
    } else {
      process.env.SPREEDLY_MCP_LOG_LEVEL = originalEnv;
    }
  });

  it("writes valid JSON with all required PCI fields to stderr", () => {
    const start = Date.now() - 42;
    emitAuditEvent("spreedly_gateway_list", "Abc123", start);

    expect(stderrSpy).toHaveBeenCalledOnce();
    const written = stderrSpy.mock.calls[0][0] as string;
    expect(written.endsWith("\n")).toBe(true);

    const parsed = JSON.parse(written.trim());
    expect(parsed.timestamp).toBeDefined();
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
    expect(parsed.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(parsed.component).toBe("spreedly-mcp");
    expect(parsed.tool).toBe("spreedly_gateway_list");
    expect(parsed.envKeyPrefix).toBe("Abc123");
    expect(parsed.status).toBe("success");
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
    expect(parsed.errorCode).toBeUndefined();
    expect(parsed.statusCode).toBeUndefined();
  });

  it("generates a unique idempotencyKey per invocation", () => {
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now());
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now());

    expect(stderrSpy).toHaveBeenCalledTimes(2);
    const key1 = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim()).idempotencyKey;
    const key2 = JSON.parse((stderrSpy.mock.calls[1][0] as string).trim()).idempotencyKey;
    expect(key1).not.toBe(key2);
  });

  it("writes to stderr exactly once per invocation", () => {
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now());

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("does not write when log level is silent", () => {
    process.env.SPREEDLY_MCP_LOG_LEVEL = "silent";
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now());

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("is case-insensitive for the silent log level", () => {
    process.env.SPREEDLY_MCP_LOG_LEVEL = "SILENT";
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now());

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("logs when log level is set to info", () => {
    process.env.SPREEDLY_MCP_LOG_LEVEL = "info";
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now());

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("classifies SpreedlyError with code and status", () => {
    emitAuditEvent("spreedly_gateway_authorize", "Xyz789", Date.now(), new SpreedlyAuthError());

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.errorCode).toBe("AUTH_ERROR");
    expect(parsed.statusCode).toBe(401);
  });

  it("classifies SpreedlyValidationError with field errors", () => {
    emitAuditEvent(
      "spreedly_payment_method_create",
      "Abc123",
      Date.now(),
      new SpreedlyValidationError("Bad input", { field: ["required"] }),
    );

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.errorCode).toBe("VALIDATION_ERROR");
    expect(parsed.statusCode).toBe(422);
  });

  it("classifies generic Error as INTERNAL_ERROR", () => {
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now(), new Error("oops"));

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.errorCode).toBe("INTERNAL_ERROR");
    expect(parsed.statusCode).toBeUndefined();
  });

  it("classifies non-Error throws as UNKNOWN_ERROR", () => {
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now(), "string error");

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.errorCode).toBe("UNKNOWN_ERROR");
  });

  it.each([null, 0, "", false])("classifies falsy throw value (%j) as error", (value) => {
    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now(), value);

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.errorCode).toBe("UNKNOWN_ERROR");
  });

  it("never includes request or response bodies in output", () => {
    emitAuditEvent("spreedly_payment_method_create", "Abc123", Date.now());

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    const keys = Object.keys(parsed);
    expect(keys).not.toContain("body");
    expect(keys).not.toContain("request");
    expect(keys).not.toContain("response");
    expect(keys).not.toContain("params");
  });

  it("never throws even when stderr.write fails", () => {
    stderrSpy.mockImplementation(() => {
      throw new Error("stderr is broken");
    });

    expect(() => emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now())).not.toThrow();
  });

  it("writes fallback message when primary write fails but stderr recovers", () => {
    let callCount = 0;
    stderrSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error("first write failed");
      return true;
    });

    emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now());

    expect(stderrSpy).toHaveBeenCalledTimes(2);
    const fallback = stderrSpy.mock.calls[1][0] as string;
    const parsed = JSON.parse(fallback.trim());
    expect(parsed.component).toBe("spreedly-mcp");
    expect(parsed.error).toBe("audit_log_write_failed");
  });

  it("never throws when all stderr writes fail", () => {
    stderrSpy.mockImplementation(() => {
      throw new Error("stderr is completely broken");
    });

    expect(() => emitAuditEvent("spreedly_gateway_list", "Abc123", Date.now())).not.toThrow();
  });
});
