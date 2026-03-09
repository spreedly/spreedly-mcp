import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";
import { createMockTransport } from "./helpers/transport.js";
import { ENV_KEY_PREFIX_LENGTH } from "../src/security/audit-logger.js";

describe("createServer", () => {
  const { transport } = createMockTransport();
  const validPrefix = "A".repeat(ENV_KEY_PREFIX_LENGTH);

  it("accepts a valid envKeyPrefix", () => {
    expect(() => createServer(transport, { envKeyPrefix: validPrefix })).not.toThrow();
  });

  it("throws when options is undefined", () => {
    expect(() => (createServer as (...args: unknown[]) => unknown)(transport)).toThrow("createServer requires");
  });

  it("throws when options is an empty object", () => {
    expect(() => (createServer as (...args: unknown[]) => unknown)(transport, {})).toThrow("createServer requires");
  });

  it("throws when envKeyPrefix is undefined", () => {
    expect(() => (createServer as (...args: unknown[]) => unknown)(transport, { envKeyPrefix: undefined })).toThrow(
      "createServer requires",
    );
  });

  it("throws when envKeyPrefix is an empty string", () => {
    expect(() => createServer(transport, { envKeyPrefix: "" })).toThrow(
      `${ENV_KEY_PREFIX_LENGTH}-character string`,
    );
  });

  it("throws when envKeyPrefix is too short", () => {
    expect(() => createServer(transport, { envKeyPrefix: "Abc" })).toThrow(
      `(got "Abc" (length 3))`,
    );
  });

  it("throws when envKeyPrefix is too long", () => {
    const long = "A".repeat(ENV_KEY_PREFIX_LENGTH + 1);
    expect(() => createServer(transport, { envKeyPrefix: long })).toThrow(
      `(length ${ENV_KEY_PREFIX_LENGTH + 1})`,
    );
  });

  it("throws when envKeyPrefix is a non-string value", () => {
    expect(() => (createServer as (...args: unknown[]) => unknown)(transport, { envKeyPrefix: 123 })).toThrow(
      "createServer requires",
    );
  });

  it("includes remediation hint in the error message", () => {
    expect(() => createServer(transport, { envKeyPrefix: "" })).toThrow(
      "validateAndExtractPrefix()",
    );
  });
});
