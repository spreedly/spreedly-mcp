import { describe, it, expect } from "vitest";
import {
  sanitizeString,
  containsInjectionAttempt,
  isValidTokenFormat,
  sanitizeParams,
  redactSensitiveValues,
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

  it("enforces strict identifier field length limits", () => {
    const longToken = "a".repeat(100);
    const longKey = "b".repeat(100);
    expect(sanitizeString(longToken, "gateway_token")).toBe("a".repeat(64));
    expect(sanitizeString(longKey, "environment_key")).toBe("b".repeat(64));
  });

  it("enforces default field length limits", () => {
    const longValue = "x".repeat(20_000);
    expect(sanitizeString(longValue, "description")).toBe("x".repeat(10_000));
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

  it("allows valid strict identifiers", () => {
    const result = sanitizeParams({
      gateway_token: "FakeGWToken_abc123",
      since_token: ["ABC-def_456"],
    });
    expect(result.gateway_token).toBe("FakeGWToken_abc123");
    expect(result.since_token).toEqual(["ABC-def_456"]);
  });

  it("throws on injection attempts", () => {
    expect(() => sanitizeParams({ name: "tool_call bad stuff" })).toThrow(
      'Invalid input detected in field "name".',
    );
  });

  it("rejects malformed token path segments", () => {
    expect(() =>
      sanitizeParams({ payment_method_token: "../../v1/environments/test.json#" }),
    ).toThrow('Invalid identifier format in field "payment_method_token".');
  });

  it("rejects token path traversal payloads before URL encoding", () => {
    // Mirrors the explicit traversal-like token coverage in `tests/transport/path.test.ts`.
    expect(() => sanitizeParams({ payment_method_token: "../../v1/receivers" })).toThrow(
      'Invalid identifier format in field "payment_method_token".',
    );
  });

  it("rejects malformed key path segments", () => {
    expect(() => sanitizeParams({ environment_key: "../access_secrets" })).toThrow(
      'Invalid identifier format in field "environment_key".',
    );
  });

  it("rejects malformed event identifiers", () => {
    expect(() => sanitizeParams({ event_id: "evt_123/metadata" })).toThrow(
      'Invalid identifier format in field "event_id".',
    );
  });

  it("rejects malformed nested identifier fields", () => {
    expect(() =>
      sanitizeParams({
        transaction: {
          payment_method_token: "token/redact.json#",
        },
      }),
    ).toThrow('Invalid identifier format in field "payment_method_token".');
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
    expect(() => sanitizeParams({ items: ["normal", "tool_call bad stuff"] })).toThrow(
      'Invalid input detected in array field "items".',
    );
  });

  it("rejects malformed identifiers inside arrays", () => {
    expect(() => sanitizeParams({ since_token: ["valid_token", "../next_page"] })).toThrow(
      'Invalid identifier format in array field "since_token".',
    );
  });

  it("passes through non-string non-object array values", () => {
    const result = sanitizeParams({ counts: [1, 2, 3] });
    expect(result.counts).toEqual([1, 2, 3]);
  });

  it("preserves an own __proto__ key without mutating the result prototype", () => {
    const payload = Object.defineProperty({}, "__proto__", {
      value: { polluted: "  yes\u200B  " },
      enumerable: true,
      configurable: true,
      writable: true,
    }) as Record<string, unknown>;

    const result = sanitizeParams(payload);

    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(true);
    expect((result.__proto__ as Record<string, unknown>).polluted).toBe("yes");
    expect((result as Record<string, unknown>).polluted).toBeUndefined();
  });
});

describe("redactSensitiveValues", () => {
  it("preserves values in explicitly allowlisted identifier fields", () => {
    const obj = {
      token: "2CJVSQ64VV8JC80QZ3GY15ZPJS",
      gateway_token: "6BqMGQTRx4YKHV2Mj91sPkR3nMf",
      payment_method_token: "2KtVWPNqR8yLXj6Fn73sDgB5mHe",
      transactionToken: "3hLWMR8vTnKQJp5Zy29xGwD4bFc",
      transaction_token: "7TnLMR8vTnKQJp5Zy29xGwD4bFd",
      merchant_profile_token: "8MpLMR8vTnKQJp5Zy29xGwD4bFe",
      certificate_token: "9CtLMR8vTnKQJp5Zy29xGwD4bFf",
      protection_provider_token: "1PpLMR8vTnKQJp5Zy29xGwD4bFg",
      sca_provider_token: "2SpLMR8vTnKQJp5Zy29xGwD4bFh",
      sca_provider_key: "3SkLMR8vTnKQJp5Zy29xGwD4bFi",
      event_token: "4EtLMR8vTnKQJp5Zy29xGwD4bFj",
      inquiry_token: "5IqLMR8vTnKQJp5Zy29xGwD4bFk",
      environment_key: "7PqXKSHnR4yLMj6Fz82tDgB5cWe",
      sub_merchant_key: "9TwXMPKnR4yLQj7Fz52sDgC8bHa",
      since_token: "ABCDEFGHIJKLMNOPQRSTUVWXYZab",
      requestId: "abcdefghijklmnopqrstuvwxyz12",
      eventId: "bcdefghijklmnopqrstuvwxyz123",
    };
    const result = redactSensitiveValues(obj) as Record<string, unknown>;
    expect(result.token).toBe(obj.token);
    expect(result.gateway_token).toBe(obj.gateway_token);
    expect(result.payment_method_token).toBe(obj.payment_method_token);
    expect(result.transactionToken).toBe(obj.transactionToken);
    expect(result.transaction_token).toBe(obj.transaction_token);
    expect(result.merchant_profile_token).toBe(obj.merchant_profile_token);
    expect(result.certificate_token).toBe(obj.certificate_token);
    expect(result.protection_provider_token).toBe(obj.protection_provider_token);
    expect(result.sca_provider_token).toBe(obj.sca_provider_token);
    expect(result.sca_provider_key).toBe(obj.sca_provider_key);
    expect(result.event_token).toBe(obj.event_token);
    expect(result.inquiry_token).toBe(obj.inquiry_token);
    expect(result.environment_key).toBe(obj.environment_key);
    expect(result.sub_merchant_key).toBe(obj.sub_merchant_key);
    expect(result.since_token).toBe(obj.since_token);
    expect(result.requestId).toBe(obj.requestId);
    expect(result.eventId).toBe(obj.eventId);
  });

  it("redacts credential-like values in non-safe fields", () => {
    const obj = {
      login: "ABCDEFGHIJKLMNOPQRSTuvwxyz",
      password: "SuperSecretCredential12345",
      api_key: "FakeGatewayApiKeyValue1234567890",
      secret_key: "FakeGatewaySecretKeyValue1234567890",
      private_key: "FakeGatewayPrivateKeyValue1234567890",
      public_key: "FakeGatewayPublicKeyValue1234567890",
      access_secret: "FakeGatewayAccessSecret1234567890",
      message: "Failed with Basic dXNlcjpwYXNzd29yZA== in header",
    };
    const result = redactSensitiveValues(obj) as Record<string, unknown>;
    expect(result.login).toBe("[REDACTED]");
    expect(result.password).toBe("[REDACTED]");
    expect(result.api_key).toBe("[REDACTED]");
    expect(result.secret_key).toBe("[REDACTED]");
    expect(result.private_key).toBe("[REDACTED]");
    expect(result.public_key).toBe("[REDACTED]");
    expect(result.access_secret).toBe("[REDACTED]");
    expect(result.message).toContain("[REDACTED]");
    expect(result.message).not.toContain("dXNlcjpwYXNzd29yZA==");
  });

  it("redacts nested credential values while preserving nested tokens", () => {
    const obj = {
      transaction: {
        token: "3hLWMR8vTnKQJp5Zy29xGwD4bFc",
        gateway_token: "6BqMGQTRx4YKHV2Mj91sPkR3nMf",
        payment_method_token: "2KtVWPNqR8yLXj6Fn73sDgB5mHe",
      },
      gateway: {
        credentials: {
          login: "FakeGatewayCredentialForRedaction12345",
        },
      },
    };
    const result = redactSensitiveValues(obj) as Record<string, unknown>;
    const txn = result.transaction as Record<string, unknown>;
    expect(txn.token).toBe("3hLWMR8vTnKQJp5Zy29xGwD4bFc");
    expect(txn.gateway_token).toBe("6BqMGQTRx4YKHV2Mj91sPkR3nMf");
    expect(txn.payment_method_token).toBe("2KtVWPNqR8yLXj6Fn73sDgB5mHe");
    const gw = result.gateway as Record<string, unknown>;
    const creds = gw.credentials as Record<string, unknown>;
    expect(creds.login).toContain("[REDACTED]");
  });

  it("handles arrays, preserving field context from parent", () => {
    const obj = {
      gateways: [
        { token: "6BqMGQTRx4YKHV2Mj91sPkR3nMf", name: "Test" },
        { token: "9WqNHSTUy7ZLIV5Pk82tQlS6oNg", name: "Other" },
      ],
    };
    const result = redactSensitiveValues(obj) as Record<string, unknown>;
    const gws = result.gateways as Array<Record<string, unknown>>;
    expect(gws[0].token).toBe("6BqMGQTRx4YKHV2Mj91sPkR3nMf");
    expect(gws[1].token).toBe("9WqNHSTUy7ZLIV5Pk82tQlS6oNg");
  });

  it("leaves non-string primitives unchanged", () => {
    const obj = { amount: 1000, succeeded: true, state: null };
    expect(redactSensitiveValues(obj)).toEqual(obj);
  });

  it("leaves short strings unchanged (below 20-char threshold)", () => {
    const obj = { message: "Succeeded!", state: "retained" };
    expect(redactSensitiveValues(obj)).toEqual(obj);
  });

  it("redacts bare strings in non-safe context", () => {
    expect(redactSensitiveValues("ABCDEFGHIJKLMNOPQRSTuvwxyz")).toBe("[REDACTED]");
  });

  it("preserves bare strings in safe field context", () => {
    expect(redactSensitiveValues("ABCDEFGHIJKLMNOPQRSTuvwxyz", "gateway_token")).toBe(
      "ABCDEFGHIJKLMNOPQRSTuvwxyz",
    );
  });

  it("does not preserve values for non-allowlisted key fields", () => {
    expect(redactSensitiveValues("FakeGatewayApiKeyValue1234567890", "api_key")).toBe("[REDACTED]");
    expect(redactSensitiveValues("FakeGatewaySecretKeyValue1234567890", "secret_key")).toBe(
      "[REDACTED]",
    );
  });

  it("preserves long error messages with normal words", () => {
    const obj = {
      message:
        "The payment method associated with this transaction is no longer valid. " +
        "Please update the customer's billing information and retry the authorization request. " +
        "Gateway responded with: card_declined_insufficient_funds.",
    };
    expect(redactSensitiveValues(obj)).toEqual(obj);
  });

  it("redacts a credential embedded in an otherwise normal error message", () => {
    const obj = {
      message:
        "Gateway authentication failed using credentials ABCDEFGHIJKLMNOPQRSTuvwxyz for merchant account.",
    };
    const result = redactSensitiveValues(obj) as Record<string, unknown>;
    expect(result.message).toContain("Gateway authentication failed using credentials");
    expect(result.message).toContain("[REDACTED]");
    expect(result.message).not.toContain("ABCDEFGHIJKLMNOPQRSTuvwxyz");
  });

  it("preserves an own __proto__ key without mutating the redacted result prototype", () => {
    const payload = Object.defineProperty({}, "__proto__", {
      value: { api_key: "FakeGatewayApiKeyValue1234567890" },
      enumerable: true,
      configurable: true,
      writable: true,
    });

    const result = redactSensitiveValues(payload) as Record<string, unknown>;
    const protoValue = result.__proto__ as Record<string, unknown>;

    expect(Object.getPrototypeOf(result)).toBeNull();
    expect(Object.prototype.hasOwnProperty.call(result, "__proto__")).toBe(true);
    expect(protoValue.api_key).toBe("[REDACTED]");
    expect((result as Record<string, unknown>).api_key).toBeUndefined();
  });
});
