import { describe, it, expect } from "vitest";
import { createServer } from "../src/server.js";
import { createMockTransport } from "./helpers/transport.js";

describe("createServer", () => {
  const { transport } = createMockTransport();

  it("accepts a valid environmentKey", () => {
    expect(() => createServer(transport, { environmentKey: "TestEnvKey123" })).not.toThrow();
  });

  it("throws when options is undefined", () => {
    expect(() => (createServer as (...args: unknown[]) => unknown)(transport)).toThrow(
      "createServer requires",
    );
  });

  it("throws when options is an empty object", () => {
    expect(() => (createServer as (...args: unknown[]) => unknown)(transport, {})).toThrow(
      "createServer requires",
    );
  });

  it("throws when environmentKey is undefined", () => {
    expect(() =>
      (createServer as (...args: unknown[]) => unknown)(transport, { environmentKey: undefined }),
    ).toThrow("createServer requires");
  });

  it("throws when environmentKey is an empty string", () => {
    expect(() => createServer(transport, { environmentKey: "" })).toThrow("non-empty string");
  });

  it("throws when environmentKey is a non-string value", () => {
    expect(() =>
      (createServer as (...args: unknown[]) => unknown)(transport, { environmentKey: 123 }),
    ).toThrow("createServer requires");
  });
});
