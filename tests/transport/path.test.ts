import { describe, it, expect } from "vitest";
import { buildUrl } from "../../src/transport/path.js";

describe("buildUrl", () => {
  it("builds path-only URLs", () => {
    expect(
      buildUrl("/payment_methods/:payment_method_token/retain.json", {
        path: { payment_method_token: "FakePMToken_pm001" },
      }),
    ).toBe("/payment_methods/FakePMToken_pm001/retain.json");
  });

  it("encodes dynamic path segments", () => {
    expect(
      buildUrl("/transactions/:transaction_token/transcript", {
        path: { transaction_token: "token/with#unsafe?chars" },
      }),
    ).toBe("/transactions/token%2Fwith%23unsafe%3Fchars/transcript");
  });

  it("combines path and query helpers", () => {
    expect(
      buildUrl("/payment_methods/:payment_method_token/events.json", {
        path: { payment_method_token: "FakePMToken_pm001" },
        query: { since_token: "evt_123", include_transactions: true },
      }),
    ).toBe(
      "/payment_methods/FakePMToken_pm001/events.json?since_token=evt_123&include_transactions=true",
    );
  });

  it("omits undefined query values", () => {
    expect(
      buildUrl("/events.json", {
        query: { since_token: "abc123", count: undefined },
      }),
    ).toBe("/events.json?since_token=abc123");
  });

  it("supports query-only URLs", () => {
    expect(
      buildUrl("/events.json", {
        query: { order: "desc", event_type: "AddGateway" },
      }),
    ).toBe("/events.json?order=desc&event_type=AddGateway");
  });

  it("encodes nested query objects with bracket notation", () => {
    expect(
      buildUrl("/payment_methods.json", {
        query: {
          metadata: {
            customer_id: "123abc",
            "unsafe key": "value/with?chars",
          },
        },
      }),
    ).toBe(
      "/payment_methods.json?metadata%5Bcustomer_id%5D=123abc&metadata%5Bunsafe%20key%5D=value%2Fwith%3Fchars",
    );
  });

  it("supports null-prototype nested query objects", () => {
    const metadata = Object.assign(Object.create(null), {
      customer_id: "123abc",
      active: true,
    }) as Record<string, string | boolean>;

    expect(
      buildUrl("/payment_methods.json", {
        query: { metadata },
      }),
    ).toBe("/payment_methods.json?metadata%5Bcustomer_id%5D=123abc&metadata%5Bactive%5D=true");
  });

  it("throws when a path parameter is missing", () => {
    expect(() =>
      buildUrl("/events/:event_id.json", {
        path: { other_key: "unused" } as Record<string, string>,
      }),
    ).toThrow('Missing path parameter "event_id".');
  });

  it("rejects inherited path parameters", () => {
    const inheritedOnly = Object.create({ event_id: "evt_123" }) as Record<string, string>;

    expect(() =>
      buildUrl("/events/:event_id.json", {
        path: inheritedOnly,
      }),
    ).toThrow('Missing path parameter "event_id".');
  });

  it("rejects null nested query objects", () => {
    expect(() =>
      buildUrl("/payment_methods.json", {
        query: { metadata: null as unknown as Record<string, string> },
      }),
    ).toThrow('Invalid query parameter "metadata". Expected a plain object.');
  });

  it("rejects array nested query objects", () => {
    expect(() =>
      buildUrl("/payment_methods.json", {
        query: { metadata: ["a", "b"] as unknown as Record<string, string> },
      }),
    ).toThrow('Invalid query parameter "metadata". Expected a plain object.');
  });

  it("rejects nested non-primitive query values", () => {
    expect(() =>
      buildUrl("/payment_methods.json", {
        query: {
          metadata: {
            nested: {} as unknown as string,
          },
        },
      }),
    ).toThrow('Invalid query parameter "metadata[nested]".');
  });
});
