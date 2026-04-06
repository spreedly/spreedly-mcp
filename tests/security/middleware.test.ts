import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { wrapHandler, type ToolHandler, type ErrorParser } from "../../src/security/middleware.js";
import { createMockTransport } from "../helpers/transport.js";
import { SpreedlyAuthError, SpreedlyError } from "../../src/transport/errors.js";
import type { SpreedlyTransport } from "../../src/transport/types.js";
import { z } from "zod";

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

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._metadata).toBeDefined();
    expect(typeof parsed._metadata.durationMs).toBe("number");
    expect(parsed._metadata.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("includes _metadata with httpStatusCode on success when transport is used", async () => {
    const responses = new Map([
      ["GET /gateways.json", { data: { gateways: [] }, headers: { "x-request-id": "req-001" } }],
    ]);
    const handler: ToolHandler<Record<string, unknown>, unknown> = async (_params, ctx) => {
      return (await ctx.transport.request("GET", "/gateways.json")).data;
    };
    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport(responses);

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed._metadata.httpStatusCode).toBe(200);
    expect(parsed._metadata.requestId).toBe("req-001");
    expect(parsed._metadata.durationMs).toBeGreaterThanOrEqual(0);
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
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBe(401);
    expect(parsed.error.message).toContain("SPREEDLY_ENVIRONMENT_KEY");
    expect(parsed._metadata).toBeDefined();
    expect(typeof parsed._metadata.durationMs).toBe("number");
    expect(parsed._metadata.httpStatusCode).toBe(401);
  });

  it("surfaces errorType for pre-http SpreedlyError failures", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyError("Request timed out.", undefined, "timeout");
    };

    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBeNull();
    expect(parsed.error.errorType).toBe("timeout");
    expect(parsed._metadata.httpStatusCode).toBeUndefined();
  });

  it("returns structured error with null httpStatusCode for generic Error", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new Error("Something broke");
    };
    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBeNull();
    expect(parsed.error.message).toBe("Something broke");
    expect(parsed._metadata).toBeDefined();
    expect(typeof parsed._metadata.durationMs).toBe("number");
  });

  it("returns structured VALIDATION_ERROR for ZodError with field details", async () => {
    const schema = z.object({ amount: z.number(), currency: z.string() }).strict();
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("test_tool", handler, (raw) => schema.parse(raw));
    const { transport } = createMockTransport();

    const result = await wrapped(
      { amount: "not_a_number", currency: 123 },
      { transport, environmentKey: TEST_ENV_KEY },
    );

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBeNull();
    expect(parsed.error.fieldErrors.amount).toEqual(expect.arrayContaining([expect.any(String)]));
    expect(parsed.error.fieldErrors.currency).toEqual(expect.arrayContaining([expect.any(String)]));
  });

  it("groups multiple ZodError issues on the same path into one fieldErrors entry", async () => {
    const schema = z.object({
      email: z.string().min(5).includes("@"),
    });
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("test_tool", handler, (raw) => schema.parse(raw));
    const { transport } = createMockTransport();

    const result = await wrapped({ email: "ab" }, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBeNull();
    expect(parsed.error.fieldErrors.email).toHaveLength(2);
    expect(parsed.error.message).toContain("email");
  });

  it("uses _root as fieldErrors key when ZodError path is empty", async () => {
    const schema = z.string();
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler("test_tool", handler, (raw) => {
      schema.parse(raw);
      return {};
    });
    const { transport } = createMockTransport();

    const result = await wrapped(42, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBeNull();
    expect(parsed.error.fieldErrors._root).toBeDefined();
    expect(parsed.error.fieldErrors._root.length).toBeGreaterThanOrEqual(1);
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

  it("rejects malformed identifiers before the handler runs", async () => {
    const handler = vi.fn<ToolHandler<Record<string, unknown>, unknown>>(async () => ({
      ok: true,
    }));
    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport, calls } = createMockTransport();

    const result = await wrapped(
      { payment_method_token: "../../v1/environments/test.json#" },
      { transport, environmentKey: TEST_ENV_KEY },
    );

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.message).toBe('Invalid identifier format in field "payment_method_token".');
    expect(handler).not.toHaveBeenCalled();
    expect(calls).toHaveLength(0);
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
    expect(entry.httpStatusCode).toBeNull();
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
    expect(result.content[0].text).toContain("401");
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
    expect(entry.httpStatusCode).toBe(401);
  });

  it("captures x-request-id from transport error via wrapper", async () => {
    const errorWithRequestId = new SpreedlyError("fail", 500);
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

  it("does not include responseBody in agent-facing error output", async () => {
    const error = new SpreedlyError("API failure", 500);
    error.responseBody = { debug: "internal-data", secret: "should-not-leak" };
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw error;
    };
    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBe(500);
    expect(parsed.error.message).toBe("API failure");
    expect(parsed.error.responseBody).toBeUndefined();
    expect(result.content[0].text).not.toContain("internal-data");
    expect(result.content[0].text).not.toContain("should-not-leak");
  });

  it("uses custom parseError hook when provided", async () => {
    const error = new SpreedlyError("Custom endpoint error", 500);
    error.responseBody = { custom_code: "SPECIAL_42", affected_resource: "gateway_xyz" };
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw error;
    };
    const customParser: ErrorParser = (err) => {
      const body = err.responseBody as Record<string, unknown> | undefined;
      return {
        customCode: body?.custom_code,
        affectedResource: body?.affected_resource,
      };
    };
    const wrapped = wrapHandler("test_tool", handler, (raw) => raw as Record<string, unknown>, {
      parseError: customParser,
    });
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport, environmentKey: TEST_ENV_KEY });

    expect(result.isError).toBe(true);
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.error.httpStatusCode).toBe(500);
    expect(parsed.error.message).toBe("Custom endpoint error");
    expect(parsed.error.customCode).toBe("SPECIAL_42");
    expect(parsed.error.affectedResource).toBe("gateway_xyz");
    expect(parsed.error.responseBody).toBeUndefined();
  });
});
