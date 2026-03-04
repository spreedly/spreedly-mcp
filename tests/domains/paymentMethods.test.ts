import { describe, it, expect } from "vitest";
import { paymentMethodTools } from "../../src/domains/paymentMethods/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakePaymentMethod, fakePaymentMethodList, fakeTransactionList, fakeEvent } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = paymentMethodTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("payment method tools", () => {
  describe("spreedly_payment_method_create", () => {
    it("creates a payment method", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["POST /payment_methods.json", { data: fakePaymentMethod() }]]),
      );
      await findTool("spreedly_payment_method_create").handler(
        { payment_method: { credit_card: { first_name: "Test", last_name: "User", number: "4111111111111111", month: 12, year: 2030 } } },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });
  });

  describe("spreedly_payment_method_list", () => {
    it("lists payment methods", async () => {
      const { transport } = createMockTransport(
        new Map([["GET /payment_methods.json", { data: fakePaymentMethodList() }]]),
      );
      const result = await findTool("spreedly_payment_method_list").handler({}, { transport });
      expect(result).toEqual(fakePaymentMethodList());
    });
  });

  describe("spreedly_payment_method_show", () => {
    it("shows a payment method", async () => {
      const { transport } = createMockTransport(
        new Map([["GET /payment_methods/FakePMToken_pm001.json", { data: fakePaymentMethod() }]]),
      );
      const result = await findTool("spreedly_payment_method_show").handler(
        { payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(result).toEqual(fakePaymentMethod());
    });
  });

  describe("spreedly_payment_method_retain", () => {
    it("retains a payment method", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["PUT /payment_methods/FakePMToken_pm001/retain.json", { data: fakePaymentMethod() }]]),
      );
      await findTool("spreedly_payment_method_retain").handler(
        { payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(calls[0].path).toBe("/payment_methods/FakePMToken_pm001/retain.json");
    });
  });

  describe("spreedly_payment_method_redact", () => {
    it("redacts a payment method", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["PUT /payment_methods/FakePMToken_pm001/redact.json", { data: fakePaymentMethod({ storage_state: "redacted" }) }]]),
      );
      await findTool("spreedly_payment_method_redact").handler(
        { payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(calls[0].path).toBe("/payment_methods/FakePMToken_pm001/redact.json");
    });
  });

  describe("spreedly_payment_method_list_transactions", () => {
    it("lists transactions for a payment method", async () => {
      const { transport } = createMockTransport(
        new Map([["GET /payment_methods/FakePMToken_pm001/transactions.json", { data: fakeTransactionList() }]]),
      );
      const result = await findTool("spreedly_payment_method_list_transactions").handler(
        { payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(result).toEqual(fakeTransactionList());
    });
  });

  describe("spreedly_payment_method_list_events", () => {
    it("lists events for a payment method", async () => {
      const events = { events: [fakeEvent().event] };
      const { transport } = createMockTransport(
        new Map([["GET /payment_methods/FakePMToken_pm001/events.json", { data: events }]]),
      );
      const result = await findTool("spreedly_payment_method_list_events").handler(
        { payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(result).toEqual(events);
    });
  });

  it("has correct number of tools", () => {
    expect(paymentMethodTools.length).toBe(13);
  });

  it("all tool names follow naming convention", () => {
    for (const tool of paymentMethodTools) {
      expect(tool.name).toMatch(/^spreedly_payment_method_/);
    }
  });
});
