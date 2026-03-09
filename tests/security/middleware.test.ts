import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { wrapHandler, type ToolHandler } from "../../src/security/middleware.js";
import { createMockTransport } from "../helpers/transport.js";
import { SpreedlyAuthError, SpreedlyError } from "../../src/transport/errors.js";
import type { SpreedlyTransport } from "../../src/transport/types.js";

const TEST_ENV_KEY = "TestEnvironmentKey123";

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

    const result = await wrapped(
      { name: "  Test\u200B  " },
      { transport, environmentKey: TEST_ENV_KEY },
    );

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Hello Test");
  });

  it("returns error result on validation failure", async () => {
    const handler: ToolHandler<{ name: string }, unknown> = async () => ({ ok: true });

    const wrapped = wrapHandler("test_tool", handler, () => {
      throw new Error("Validation failed");
    });
    const { transport } = createMockTransport();

    const result = await wrapped({ bad: "data" }, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Validation failed");
  });

  it("returns error result on SpreedlyError", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };

    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_ERROR");
    expect(result.content[0].text).toContain("SPREEDLY_ENVIRONMENT_KEY");
  });

  it("blocks injection attempts in inputs", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped(
      { name: "tool_call inject" },
      { transport, environmentKey: TEST_ENV_KEY },
    );

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("redacts credentials from error messages", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new Error("Failed with Basic dXNlcjpwYXNzd29yZA== in header");
    };

    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain("dXNlcjpwYXNzd29yZA==");
    expect(result.content[0].text).toContain("[REDACTED]");
  });

  it("emits audit log on successful invocation", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler(
      "spreedly_gateway_list",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.tool).toBe("spreedly_gateway_list");
    expect(entry.environmentKey).toBe(TEST_ENV_KEY);
    expect(entry.status).toBe("success");
    expect(entry.component).toBe("spreedly-mcp");
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(entry.timestamp).toBeDefined();
    expect(entry.eventId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it("emits audit log with error details on SpreedlyError", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };
    const wrapped = wrapHandler(
      "spreedly_gateway_authorize",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.tool).toBe("spreedly_gateway_authorize");
    expect(entry.status).toBe("error");
    expect(entry.errorCode).toBe("AUTH_ERROR");
    expect(entry.httpStatusCode).toBe(401);
  });

  it("emits audit log on validation rejection", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("spreedly_payment_method_create", handler, () => {
      throw new Error("Validation failed");
    });
    const { transport } = createMockTransport();

    await wrapped({ bad: "data" }, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.tool).toBe("spreedly_payment_method_create");
    expect(entry.status).toBe("error");
    expect(entry.errorCode).toBe("INTERNAL_ERROR");
  });

  it("writes audit log exactly once per successful invocation", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler(
      "spreedly_gateway_list",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("writes audit log exactly once per failed invocation", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };
    const wrapped = wrapHandler(
      "spreedly_gateway_authorize",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
  });

  it("returns success result even when stderr is broken", async () => {
    stderrSpy.mockImplementation(() => {
      throw new Error("stderr is broken");
    });

    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler(
      "spreedly_gateway_list",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

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
    const wrapped = wrapHandler(
      "spreedly_gateway_authorize",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_ERROR");
  });

  it("includes x-request-id and httpStatusCode in audit log on success", async () => {
    const responses = new Map([
      [
        "GET /gateways.json",
        { data: { gateways: [] }, headers: { "x-request-id": "req-success-001" } },
      ],
    ]);
    const handler: ToolHandler<Record<string, unknown>, unknown> = async (_params, ctx) => {
      const res = await ctx.transport.request("GET", "/gateways.json");
      return res.data;
    };
    const wrapped = wrapHandler(
      "spreedly_gateway_list",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport(responses);

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.requestId).toBe("req-success-001");
    expect(entry.httpStatusCode).toBe(200);
    expect(entry.status).toBe("success");
  });

  it("includes x-request-id in audit log on SpreedlyError", async () => {
    const authError = new SpreedlyAuthError();
    authError.requestId = "req-error-002";
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw authError;
    };
    const wrapped = wrapHandler(
      "spreedly_gateway_authorize",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.requestId).toBe("req-error-002");
    expect(entry.status).toBe("error");
    expect(entry.errorCode).toBe("AUTH_ERROR");
  });

  it("captures x-request-id from transport error via wrapper", async () => {
    const errorWithRequestId = new SpreedlyError("fail", "API_ERROR", 500);
    errorWithRequestId.requestId = "req-transport-003";
    const throwingTransport: SpreedlyTransport = Object.freeze({
      async request() {
        throw errorWithRequestId;
      },
    });
    const handler: ToolHandler<Record<string, unknown>, unknown> = async (_params, ctx) => {
      return (await ctx.transport.request("GET", "/gateways.json")).data;
    };
    const wrapped = wrapHandler(
      "spreedly_gateway_list",
      handler,
      (raw) => raw as Record<string, unknown>,
    );

    await wrapped({}, { transport: throwingTransport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.requestId).toBe("req-transport-003");
  });

  it("omits requestId from audit log when no transport call is made", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler(
      "spreedly_gateway_list",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport();

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(stderrSpy).toHaveBeenCalledOnce();
    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.requestId).toBeUndefined();
    expect(Object.keys(entry)).not.toContain("requestId");
  });

  it("captures the last x-request-id when handler makes multiple transport calls", async () => {
    const responses = new Map([
      ["GET /gateways.json", { data: { gateways: [] }, headers: { "x-request-id": "req-first" } }],
      [
        "GET /payment_methods.json",
        { data: { payment_methods: [] }, headers: { "x-request-id": "req-second" } },
      ],
    ]);
    const handler: ToolHandler<Record<string, unknown>, unknown> = async (_params, ctx) => {
      await ctx.transport.request("GET", "/gateways.json");
      const res = await ctx.transport.request("GET", "/payment_methods.json");
      return res.data;
    };
    const wrapped = wrapHandler(
      "test_multi_call",
      handler,
      (raw) => raw as Record<string, unknown>,
    );
    const { transport } = createMockTransport(responses);

    await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    const entry = JSON.parse((stderrSpy.mock.calls[0][0] as string).trim());
    expect(entry.requestId).toBe("req-second");
  });
});
