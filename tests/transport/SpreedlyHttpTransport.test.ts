import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTransport } from "../../src/transport/SpreedlyHttpTransport.js";
import {
  SpreedlyAuthError,
  SpreedlyNotFoundError,
  SpreedlyValidationError,
  SpreedlyError,
} from "../../src/transport/errors.js";
import { FAKE_ENV_KEY, FAKE_ACCESS_SECRET } from "../helpers/fixtures.js";
import { version } from "../../package.json";

describe("SpreedlyHttpTransport", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends Basic Auth header with correct encoding", async () => {
    const expectedAuth = `Basic ${Buffer.from(`${FAKE_ENV_KEY}:${FAKE_ACCESS_SECRET}`).toString("base64")}`;
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>));
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await transport.request("GET", "/test");

    expect(capturedHeaders["Authorization"]).toBe(expectedAuth);
  });

  it("sends JSON content type header", async () => {
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>));
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await transport.request("GET", "/test");

    expect(capturedHeaders["Content-Type"]).toBe("application/json");
    expect(capturedHeaders["Accept"]).toBe("application/json");
  });

  it("sends User-Agent header with package version", async () => {
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>));
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await transport.request("GET", "/test");

    expect(capturedHeaders["User-Agent"]).toBe(`Spreedly/MCP v${version}`);
  });

  it("constructs full URL from base URL and path", async () => {
    let capturedUrl = "";

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await transport.request("GET", "/gateways.json");

    expect(capturedUrl).toBe("https://core.spreedly.com/v1/gateways.json");
  });

  it("supports custom base URL", async () => {
    let capturedUrl = "";

    globalThis.fetch = vi.fn().mockImplementation(async (url: string) => {
      capturedUrl = url;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET, {
      baseUrl: "https://custom.api.test/v2",
    });
    await transport.request("GET", "/test");

    expect(capturedUrl).toBe("https://custom.api.test/v2/test");
  });

  it("serializes request body as JSON for POST", async () => {
    let capturedBody = "";

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await transport.request("POST", "/test", { body: { key: "value" } });

    expect(JSON.parse(capturedBody)).toEqual({ key: "value" });
  });

  it("does not send body for GET requests", async () => {
    let capturedBody: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedBody = init.body as string | undefined;
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await transport.request("GET", "/test", { body: { ignored: true } });

    expect(capturedBody).toBeUndefined();
  });

  it("parses JSON response body", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ gateway: { token: "abc" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    const result = await transport.request("GET", "/test");

    expect(result.data).toEqual({ gateway: { token: "abc" } });
    expect(result.status).toBe(200);
  });

  it("throws SpreedlyAuthError on 401", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await expect(transport.request("GET", "/test")).rejects.toThrow(SpreedlyAuthError);
  });

  it("throws SpreedlyNotFoundError on 404", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await expect(transport.request("GET", "/test")).rejects.toThrow(SpreedlyNotFoundError);
  });

  it("throws SpreedlyValidationError on 422 with field errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ errors: { amount: ["must be positive"] } }), {
        status: 422,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    try {
      await transport.request("POST", "/test");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpreedlyValidationError);
      expect((err as SpreedlyValidationError).fieldErrors).toEqual({
        amount: ["must be positive"],
      });
    }
  });

  it("throws SpreedlyValidationError on 422 with canonical array errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [
            { key: "errors.amount", message: "Amount is required." },
            { key: "errors.currency_code", message: "Currency code is required." },
          ],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    try {
      await transport.request("POST", "/test");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpreedlyValidationError);
      const ve = err as SpreedlyValidationError;
      expect(ve.fieldErrors).toEqual({
        amount: ["Amount is required."],
        currency_code: ["Currency code is required."],
      });
    }
  });

  it("derives fieldErrors from attribute when present in array errors", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ key: "errors.gateway", attribute: "gateway_type", message: "can't be blank" }],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    try {
      await transport.request("POST", "/test");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpreedlyValidationError);
      const ve = err as SpreedlyValidationError;
      expect(ve.fieldErrors).toEqual({
        gateway_type: ["can't be blank"],
      });
    }
  });

  it("groups array errors with no derivable field under _base", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          errors: [{ key: "general", message: "Something went wrong." }],
        }),
        { status: 422, headers: { "Content-Type": "application/json" } },
      ),
    );

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    try {
      await transport.request("POST", "/test");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpreedlyValidationError);
      const ve = err as SpreedlyValidationError;
      expect(ve.fieldErrors).toEqual({
        _base: ["Something went wrong."],
      });
    }
  });

  it("throws SpreedlyError on network failure", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError("fetch failed"));

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    try {
      await transport.request("GET", "/test");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpreedlyError);
      const error = err as SpreedlyError;
      expect(error.statusCode).toBeUndefined();
      expect(error.errorType).toBe("network");
    }
  });

  it("throws pre-http timeout errors with errorType timeout", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));

    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    try {
      await transport.request("GET", "/test");
      expect.fail("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SpreedlyError);
      const error = err as SpreedlyError;
      expect(error.statusCode).toBeUndefined();
      expect(error.errorType).toBe("timeout");
      expect(error.message).toBe("Request timed out.");
    }
  });

  it("credentials are not exposed on the transport object", () => {
    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    const json = JSON.stringify(transport);
    expect(json).not.toContain(FAKE_ENV_KEY);
    expect(json).not.toContain(FAKE_ACCESS_SECRET);

    const keys = Object.keys(transport);
    expect(keys).toEqual(["request"]);
  });

  it("transport object is frozen", () => {
    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    expect(Object.isFrozen(transport)).toBe(true);
  });

  it("rejects non-HTTPS base URLs", () => {
    expect(() =>
      createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET, {
        baseUrl: "http://core.spreedly.com/v1",
      }),
    ).toThrow("Transport baseUrl must use HTTPS.");
  });

  it("allows HTTPS base URLs", () => {
    expect(() =>
      createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET, {
        baseUrl: "https://custom.api.test/v2",
      }),
    ).not.toThrow();
  });

  it("custom headers cannot override Authorization", async () => {
    let capturedHeaders: Record<string, string> = {};

    globalThis.fetch = vi.fn().mockImplementation(async (_url: string, init: RequestInit) => {
      capturedHeaders = Object.fromEntries(Object.entries(init.headers as Record<string, string>));
      return new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });

    const expectedAuth = `Basic ${Buffer.from(`${FAKE_ENV_KEY}:${FAKE_ACCESS_SECRET}`).toString("base64")}`;
    const transport = createTransport(FAKE_ENV_KEY, FAKE_ACCESS_SECRET);
    await transport.request("GET", "/test", {
      headers: { Authorization: "Basic attacker-creds" },
    });

    expect(capturedHeaders["Authorization"]).toBe(expectedAuth);
  });
});
