import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { wrapHandler, type ToolHandler } from "../../src/security/middleware.js";
import { createMockTransport } from "../helpers/transport.js";
import { SpreedlyAuthError } from "../../src/transport/errors.js";

const TEST_ENV_KEY_PREFIX = "TstPfx";

describe("wrapHandler middleware", () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    stderrSpy = vi.spyOn(process.stderr, "write").mockReturnValue(true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
  });

  it("sanitizes, validates, and returns formatted result", async () => {
    const handler: ToolHandler<{ name: string }, { result: string }> = async (params) => {
      return { result: `Hello ${params.name}` };
    };

    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as { name: string });
    const { transport } = createMockTransport();

    const result = await wrapped({ name: "  Test\u200B  " }, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Hello Test");
  });

  it("returns error result on validation failure", async () => {
    const handler: ToolHandler<{ name: string }, unknown> = async () => ({ ok: true });

    const wrapped = wrapHandler("test_tool", handler, () => {
      throw new Error("Validation failed");
    });
    const { transport } = createMockTransport();

    const result = await wrapped({ bad: "data" }, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Validation failed");
  });

  it("returns error result on SpreedlyError", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };

    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_ERROR");
    expect(result.content[0].text).toContain("SPREEDLY_ENVIRONMENT_KEY");
  });

  it("blocks injection attempts in inputs", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({ name: "tool_call inject" }, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("redacts credentials from error messages", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new Error("Failed with Basic dXNlcjpwYXNzd29yZA== in header");
    };

    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain("dXNlcjpwYXNzd29yZA==");
    expect(result.content[0].text).toContain("[REDACTED]");
  });

  it("emits audit log on successful invocation", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("spreedly_gateway_list", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.tool).toBe("spreedly_gateway_list");
    expect(entry.envKeyPrefix).toBe(TEST_ENV_KEY_PREFIX);
    expect(entry.status).toBe("success");
    expect(entry.component).toBe("spreedly-mcp");
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(entry.timestamp).toBeDefined();
    expect(entry.idempotencyKey).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("emits audit log with error details on SpreedlyError", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };
    const wrapped = wrapHandler("spreedly_gateway_authorize", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.tool).toBe("spreedly_gateway_authorize");
    expect(entry.status).toBe("error");
    expect(entry.errorCode).toBe("AUTH_ERROR");
    expect(entry.statusCode).toBe(401);
  });

  it("emits audit log on validation rejection", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("spreedly_payment_method_create", handler, () => {
      throw new Error("Validation failed");
    });
    const { transport } = createMockTransport();

    await wrapped({ bad: "data" }, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.tool).toBe("spreedly_payment_method_create");
    expect(entry.status).toBe("error");
    expect(entry.errorCode).toBe("INTERNAL_ERROR");
  });

  it("writes audit log exactly once per successful invocation", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("spreedly_gateway_list", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("writes audit log exactly once per failed invocation", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };
    const wrapped = wrapHandler("spreedly_gateway_authorize", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("returns success result even when stderr is broken", async () => {
    stderrSpy.mockImplementation(() => {
      throw new Error("stderr is broken");
    });

    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("spreedly_gateway_list", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain('"ok": true');
  });

  it("returns error result even when stderr is broken on error path", async () => {
    stderrSpy.mockImplementation(() => {
      throw new Error("stderr is broken");
    });

    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };
    const wrapped = wrapHandler("spreedly_gateway_authorize", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, envKeyPrefix: TEST_ENV_KEY_PREFIX });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_ERROR");
  });
});
