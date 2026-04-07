import { describe, it, expect } from "vitest";
import { paymentMethodTools } from "../../src/domains/paymentMethods/tools.js";
import { UpdateGratisSchema } from "../../src/domains/paymentMethods/schemas.js";
import { createMockTransport } from "../helpers/transport.js";
import {
  fakePaymentMethod,
  fakePaymentMethodList,
  fakeTransactionList,
  fakeEvent,
} from "../helpers/fixtures.js";

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
        {
          payment_method: {
            credit_card: {
              first_name: "Test",
              last_name: "User",
              number: "4111111111111111",
              month: 12,
              year: 2030,
            },
          },
        },
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

    it("forwards supported query filters safely", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["GET /payment_methods.json", { data: fakePaymentMethodList() }]]),
      );
      await findTool("spreedly_payment_method_list").handler(
        {
          since_token: "pm_cursor/next#1",
          order: "desc",
          metadata: { customer_id: "abc/123" },
          state: "redacted",
          count: "25",
        },
        { transport },
      );
      expect(calls[0].path).toBe(
        "/payment_methods.json?since_token=pm_cursor%2Fnext%231&order=desc&metadata%5Bcustomer_id%5D=abc%2F123&state=redacted&count=25",
      );
    });
  });

  describe("spreedly_payment_method_show", () => {
    it("shows a payment method", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["GET /payment_methods/FakePMToken_pm001.json", { data: fakePaymentMethod() }]]),
      );
      const result = await findTool("spreedly_payment_method_show").handler(
        { payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(result).toEqual(fakePaymentMethod());
      expect(calls[0].path).toBe("/payment_methods/FakePMToken_pm001.json");
    });
  });

  describe("spreedly_payment_method_retain", () => {
    it("retains a payment method", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          ["PUT /payment_methods/FakePMToken_pm001/retain.json", { data: fakePaymentMethod() }],
        ]),
      );
      await findTool("spreedly_payment_method_retain").handler(
        { payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(calls[0].path).toBe("/payment_methods/FakePMToken_pm001/retain.json");
    });
  });

  describe("spreedly_payment_method_list_transactions", () => {
    it("lists transactions for a payment method", async () => {
      const { transport } = createMockTransport(
        new Map([
          [
            "GET /payment_methods/FakePMToken_pm001/transactions.json",
            { data: fakeTransactionList() },
          ],
        ]),
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

    it("forwards event query options safely", async () => {
      const events = { events: [fakeEvent().event] };
      const { transport, calls } = createMockTransport(
        new Map([["GET /payment_methods/FakePMToken_pm001/events.json", { data: events }]]),
      );
      await findTool("spreedly_payment_method_list_events").handler(
        {
          payment_method_token: "FakePMToken_pm001",
          since_token: "evt/123#frag",
          count: "15",
          include_transactions: true,
        },
        { transport },
      );
      expect(calls[0].path).toBe(
        "/payment_methods/FakePMToken_pm001/events.json?since_token=evt%2F123%23frag&count=15&include_transactions=true",
      );
    });
  });

  describe("spreedly_payment_method_list_all_events", () => {
    it("forwards global payment method event filters safely", async () => {
      const events = { events: [fakeEvent().event] };
      const { transport, calls } = createMockTransport(
        new Map([["GET /payment_methods/events.json", { data: events }]]),
      );
      await findTool("spreedly_payment_method_list_all_events").handler(
        {
          since_token: "evt/after#cursor",
          order: "asc",
          event_type: "RetainPaymentMethod",
          count: "10",
          include_transactions: false,
        },
        { transport },
      );
      expect(calls[0].path).toBe(
        "/payment_methods/events.json?since_token=evt%2Fafter%23cursor&order=asc&event_type=RetainPaymentMethod&count=10&include_transactions=false",
      );
    });
  });

  describe("UpdateGratisSchema", () => {
    it("accepts boolean-only update_gratis fields", () => {
      const result = UpdateGratisSchema.safeParse({
        payment_method_token: "FakePMToken_pm001",
        payment_method: {
          managed: true,
          eligible_for_card_updater: false,
          allow_blank_name: true,
        },
      });

      expect(result.success).toBe(true);
    });

    it("rejects non-boolean values for update_gratis flags", () => {
      const result = UpdateGratisSchema.safeParse({
        payment_method_token: "FakePMToken_pm001",
        payment_method: {
          managed: "true",
          allow_blank_date: 1,
        },
      });

      expect(result.success).toBe(false);
    });
  });

  it("has correct number of tools", () => {
    expect(paymentMethodTools.length).toBe(12);
  });

  it("all tool names follow naming convention", () => {
    for (const tool of paymentMethodTools) {
      expect(tool.name).toMatch(/^spreedly_payment_method_/);
    }
  });
});
