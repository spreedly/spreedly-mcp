import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { emitAuditEvent } from "../../src/security/audit-logger.js";
import { SpreedlyAuthError, SpreedlyValidationError } from "../../src/transport/errors.js";

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
    emitAuditEvent("spreedly_gateway_list", "Abc123XyzLongEnoughKey", start);

    expect(stderrSpy).toHaveBeenCalledOnce();
    const written = stderrSpy.mock.calls[0][0] as string;
    expect(written.endsWith("\n")).toBe(true);

    const parsed = JSON.parse(written.trim());
    expect(parsed.timestamp).toBeDefined();
    expect(new Date(parsed.timestamp).toISOString()).toBe(parsed.timestamp);
    expect(parsed.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(parsed.component).toBe("spreedly-mcp");
    expect(parsed.tool).toBe("spreedly_gateway_list");
    expect(parsed.environmentKey).toBe("Abc123XyzLongEnoughKey");
    expect(parsed.status).toBe("success");
    expect(parsed.durationMs).toBeGreaterThanOrEqual(0);
    expect(parsed.httpStatusCode).toBeUndefined();
    expect(parsed.requestId).toBeUndefined();
  });

  it("generates a unique eventId per invocation", () => {
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());

    expect(stderrSpy).toHaveBeenCalledTimes(2);
    const key1 = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim()).eventId;
    const key2 = JSON.parse((stderrSpy.mock.calls[1][0] as string).trim()).eventId;
    expect(key1).not.toBe(key2);
  });

  it("writes to stderr exactly once per invocation", () => {
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("does not write when log level is silent", () => {
    process.env.SPREEDLY_MCP_LOG_LEVEL = "silent";
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("is case-insensitive for the silent log level", () => {
    process.env.SPREEDLY_MCP_LOG_LEVEL = "SILENT";
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());

    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it("logs when log level is set to info", () => {
    process.env.SPREEDLY_MCP_LOG_LEVEL = "info";
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("sets httpStatusCode to null for SpreedlyError without httpContext", () => {
    emitAuditEvent(
      "spreedly_gateway_authorize",
      "TestEnvKey123",
      Date.now(),
      new SpreedlyAuthError(),
    );

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.httpStatusCode).toBeNull();
  });

  it("sets httpStatusCode to null for SpreedlyValidationError without httpContext", () => {
    emitAuditEvent(
      "spreedly_payment_method_create",
      "TestEnvKey123",
      Date.now(),
      new SpreedlyValidationError("Bad input", { field: ["required"] }),
    );

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.httpStatusCode).toBeNull();
  });

  it("sets httpStatusCode to null for generic Error", () => {
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now(), new Error("oops"));

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.httpStatusCode).toBeNull();
  });

  it("sets httpStatusCode to null for non-Error throws", () => {
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now(), "string error");

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.httpStatusCode).toBeNull();
  });

  it.each([null, 0, "", false])(
    "sets httpStatusCode to null for falsy throw value (%j)",
    (value) => {
      emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now(), value);

      const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
      expect(parsed.status).toBe("error");
      expect(parsed.httpStatusCode).toBeNull();
    },
  );

  it("includes httpStatusCode on success when provided via httpContext", () => {
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now(), undefined, {
      requestId: "req-ok",
      httpStatusCode: 200,
    });

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("success");
    expect(parsed.httpStatusCode).toBe(200);
    expect(parsed.requestId).toBe("req-ok");
  });

  it("includes httpStatusCode on error when provided via httpContext", () => {
    emitAuditEvent(
      "spreedly_gateway_authorize",
      "TestEnvKey123",
      Date.now(),
      new SpreedlyAuthError(),
      {
        requestId: "req-err",
        httpStatusCode: 401,
      },
    );

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.status).toBe("error");
    expect(parsed.httpStatusCode).toBe(401);
    expect(parsed.requestId).toBe("req-err");
  });

  it("omits httpStatusCode and requestId when httpContext is not provided", () => {
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(Object.keys(parsed)).not.toContain("requestId");
    expect(Object.keys(parsed)).not.toContain("httpStatusCode");
  });

  it("omits httpStatusCode when httpContext has only requestId", () => {
    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now(), undefined, {
      requestId: "req-only",
    });

    const parsed = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(parsed.requestId).toBe("req-only");
    expect(Object.keys(parsed)).not.toContain("httpStatusCode");
  });

  it("never includes request or response bodies in output", () => {
    emitAuditEvent("spreedly_payment_method_create", "TestEnvKey123", Date.now());

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

    expect(() =>
      emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now()),
    ).not.toThrow();
  });

  it("writes fallback message when primary write fails but stderr recovers", () => {
    let callCount = 0;
    stderrSpy.mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error("first write failed");
      return true;
    });

    emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now());

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

    expect(() =>
      emitAuditEvent("spreedly_gateway_list", "TestEnvKey123", Date.now()),
    ).not.toThrow();
  });
});
