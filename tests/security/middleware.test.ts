import { describe, it, expect } from "vitest";
import { wrapHandler, type ToolHandler } from "../../src/security/middleware.js";
import { createMockTransport } from "../helpers/transport.js";
import { SpreedlyAuthError } from "../../src/transport/errors.js";

describe("wrapHandler middleware", () => {
  it("sanitizes, validates, and returns formatted result", async () => {
    const handler: ToolHandler<{ name: string }, { result: string }> = async (params) => {
      return { result: `Hello ${params.name}` };
    };

    const wrapped = wrapHandler(handler, (raw) => raw as { name: string });
    const { transport } = createMockTransport();

    const result = await wrapped({ name: "  Test\u200B  " }, { transport });

    expect(result.isError).toBeUndefined();
    expect(result.content[0].text).toContain("Hello Test");
  });

  it("returns error result on validation failure", async () => {
    const handler: ToolHandler<{ name: string }, unknown> = async () => ({ ok: true });

    const wrapped = wrapHandler(handler, () => {
      throw new Error("Validation failed");
    });
    const { transport } = createMockTransport();

    const result = await wrapped({ bad: "data" }, { transport });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Validation failed");
  });

  it("returns error result on SpreedlyError", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new SpreedlyAuthError();
    };

    const wrapped = wrapHandler(handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("AUTH_ERROR");
    expect(result.content[0].text).toContain("SPREEDLY_ENVIRONMENT_KEY");
  });

  it("blocks injection attempts in inputs", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => ({ ok: true });
    const wrapped = wrapHandler(handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({ name: "tool_call inject" }, { transport });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("Invalid input");
  });

  it("redacts credentials from error messages", async () => {
    const handler: ToolHandler<Record<string, unknown>, unknown> = async () => {
      throw new Error("Failed with Basic dXNlcjpwYXNzd29yZA== in header");
    };

    const wrapped = wrapHandler(handler, (raw) => raw as Record<string, unknown>);
    const { transport } = createMockTransport();

    const result = await wrapped({}, { transport });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).not.toContain("dXNlcjpwYXNzd29yZA==");
    expect(result.content[0].text).toContain("[REDACTED]");
  });
});
