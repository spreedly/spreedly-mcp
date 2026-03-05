import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  containsInjectionAttempt,
  isValidTokenFormat,
  sanitizeParams,
  redactCredentials,
} from "../../src/security/sanitizer.js";

describe("sanitizeString", () => {
  it("strips zero-width characters", () => {
    expect(sanitizeString("hello\u200Bworld")).toBe("helloworld");
    expect(sanitizeString("test\uFEFFvalue")).toBe("testvalue");
    expect(sanitizeString("foo\u200Cbar\u200D")).toBe("foobar");
  });

  it("strips directional override characters", () => {
    expect(sanitizeString("normal\u202Atext\u202E")).toBe("normaltext");
  });

  it("trims whitespace", () => {
    expect(sanitizeString("  hello  ")).toBe("hello");
  });

  it("enforces token field length limits", () => {
    const longToken = "a".repeat(100);
    expect(sanitizeString(longToken, "gateway_token").length).toBe(64);
  });

  it("enforces default field length limits", () => {
    const longValue = "x".repeat(20_000);
    expect(sanitizeString(longValue, "description").length).toBe(10_000);
  });
});

describe("containsInjectionAttempt", () => {
  it("detects tool_call injection", () => {
    expect(containsInjectionAttempt("normal text tool_call here")).toBe(true);
  });

  it("detects system prompt markers", () => {
    expect(containsInjectionAttempt("SYSTEM: do something bad")).toBe(true);
    expect(containsInjectionAttempt("<|im_start|>system")).toBe(true);
  });

  it("passes clean text", () => {
    expect(containsInjectionAttempt("John Doe")).toBe(false);
    expect(containsInjectionAttempt("Purchase for order #12345")).toBe(false);
  });
});

describe("isValidTokenFormat", () => {
  it("accepts valid tokens", () => {
    expect(isValidTokenFormat("abc123")).toBe(true);
    expect(isValidTokenFormat("ABC-def_456")).toBe(true);
    expect(isValidTokenFormat("FakeGWToken_abc123")).toBe(true);
  });

  it("rejects invalid tokens", () => {
    expect(isValidTokenFormat("")).toBe(false);
    expect(isValidTokenFormat("has spaces")).toBe(false);
    expect(isValidTokenFormat("has.dots")).toBe(false);
    expect(isValidTokenFormat("a".repeat(65))).toBe(false);
  });
});

describe("sanitizeParams", () => {
  it("sanitizes string values", () => {
    const result = sanitizeParams({ name: "  hello\u200B  " });
    expect(result.name).toBe("hello");
  });

  it("sanitizes nested objects", () => {
    const result = sanitizeParams({ gateway: { name: "  test\uFEFF  " } });
    expect((result.gateway as Record<string, unknown>).name).toBe("test");
  });

  it("passes through non-string values", () => {
    const result = sanitizeParams({ amount: 100, active: true });
    expect(result.amount).toBe(100);
    expect(result.active).toBe(true);
  });

  it("throws on injection attempts", () => {
    expect(() => sanitizeParams({ name: "tool_call bad stuff" })).toThrow(
      'Invalid input detected in field "name".',
    );
  });

  it("sanitizes string values inside arrays", () => {
    const result = sanitizeParams({ tokens: ["  hello\u200B  ", "world\uFEFF"] });
    expect(result.tokens).toEqual(["hello", "world"]);
  });

  it("sanitizes objects inside arrays", () => {
    const result = sanitizeParams({
      credentials: [{ name: "  key\u200B  ", value: "  secret\uFEFF  " }],
    });
    expect(result.credentials).toEqual([{ name: "key", value: "secret" }]);
  });

  it("throws on injection attempts inside arrays", () => {
    expect(() =>
      sanitizeParams({ items: ["normal", "tool_call bad stuff"] }),
    ).toThrow('Invalid input detected in array field "items".');
  });

  it("passes through non-string non-object array values", () => {
    const result = sanitizeParams({ counts: [1, 2, 3] });
    expect(result.counts).toEqual([1, 2, 3]);
  });
});

describe("redactCredentials", () => {
  it("redacts Basic auth headers", () => {
    expect(redactCredentials("Authorization: Basic dXNlcjpwYXNz")).toContain("[REDACTED]");
  });

  it("redacts Bearer tokens", () => {
    expect(redactCredentials("Bearer eyJhbGciOiJIUzI1NiJ9.abc.def")).toContain("[REDACTED]");
  });

  it("redacts long base64 strings", () => {
    const longB64 = "A".repeat(50);
    expect(redactCredentials(`secret: ${longB64}`)).toContain("[REDACTED]");
  });

  it("redacts base64 strings as short as 20 chars", () => {
    const shortB64 = "A".repeat(20);
    expect(redactCredentials(`key: ${shortB64}`)).toContain("[REDACTED]");
  });

  it("does not redact base64 strings shorter than 20 chars", () => {
    const tooShort = "A".repeat(19);
    expect(redactCredentials(`key: ${tooShort}`)).toBe(`key: ${tooShort}`);
  });

  it("leaves short safe strings unchanged", () => {
    expect(redactCredentials("amount: 100")).toBe("amount: 100");
  });
});
