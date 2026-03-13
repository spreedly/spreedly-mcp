import { describe, it, expect } from "vitest";
import { createServer, SERVER_INSTRUCTIONS } from "../src/server.js";
import { createMockTransport } from "./helpers/transport.js";
import type { ToolPolicyConfig } from "../src/security/toolPolicy.js";

const defaultPolicy: ToolPolicyConfig = {
  paymentMethodTokenizationEnabled: false,
  transactionInitiationEnabled: false,
  administrativeEnabled: false,
};

describe("createServer", () => {
  const { transport } = createMockTransport();

  it("accepts a valid environmentKey", () => {
    expect(() =>
      createServer(transport, defaultPolicy, { environmentKey: "TestEnvKey123" }),
    ).not.toThrow();
  });

  it("throws when options is undefined", () => {
    expect(() =>
      (createServer as (...args: unknown[]) => unknown)(transport, defaultPolicy),
    ).toThrow("createServer requires");
  });

  it("throws when options is an empty object", () => {
    expect(() =>
      (createServer as (...args: unknown[]) => unknown)(transport, defaultPolicy, {}),
    ).toThrow("createServer requires");
  });

  it("throws when environmentKey is undefined", () => {
    expect(() =>
      (createServer as (...args: unknown[]) => unknown)(transport, defaultPolicy, {
        environmentKey: undefined,
      }),
    ).toThrow("createServer requires");
  });

  it("throws when environmentKey is an empty string", () => {
    expect(() => createServer(transport, defaultPolicy, { environmentKey: "" })).toThrow(
      "non-empty string",
    );
  });

  it("throws when environmentKey is a non-string value", () => {
    expect(() =>
      (createServer as (...args: unknown[]) => unknown)(transport, defaultPolicy, {
        environmentKey: 123,
      }),
    ).toThrow("createServer requires");
  });
});

describe("SERVER_INSTRUCTIONS", () => {
  it("is a non-empty string", () => {
    expect(typeof SERVER_INSTRUCTIONS).toBe("string");
    expect(SERVER_INSTRUCTIONS.length).toBeGreaterThan(100);
  });

  it("contains key sections for consuming agents", () => {
    expect(SERVER_INSTRUCTIONS).toContain("Terminology");
    expect(SERVER_INSTRUCTIONS).toContain("Error Handling");
    expect(SERVER_INSTRUCTIONS).toContain("Tool Access Policy");
    expect(SERVER_INSTRUCTIONS).toContain("Should I Reuse a Token");
    expect(SERVER_INSTRUCTIONS).toContain("Common Workflows");
    expect(SERVER_INSTRUCTIONS).toContain("Amount Format");
  });
});
