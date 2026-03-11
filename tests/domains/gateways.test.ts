import { describe, it, expect } from "vitest";
import { gatewayTools } from "../../src/domains/gateways/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import {
  fakeGateway,
  fakeGatewayList,
  fakeGatewayOptions,
  fakeTransaction,
  fakeTransactionList,
} from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = gatewayTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("gateway tools", () => {
  describe("spreedly_gateway_create", () => {
    it("creates a gateway with the correct request", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["POST /gateways.json", { data: fakeGateway() }]]),
      );
      const tool = findTool("spreedly_gateway_create");
      const result = await tool.handler({ gateway_type: "test" }, { transport });
      expect(result).toEqual(fakeGateway());
      expect(calls[0].method).toBe("POST");
      expect(calls[0].path).toBe("/gateways.json");
    });
  });

  describe("spreedly_gateway_list", () => {
    it("lists gateways", async () => {
      const { transport } = createMockTransport(
        new Map([["GET /gateways.json", { data: fakeGatewayList() }]]),
      );
      const tool = findTool("spreedly_gateway_list");
      const result = await tool.handler({}, { transport });
      expect(result).toEqual(fakeGatewayList());
    });
  });

  describe("spreedly_gateway_show", () => {
    it("shows a gateway by token", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["GET /gateways/FakeGWToken_abc123.json", { data: fakeGateway() }]]),
      );
      const tool = findTool("spreedly_gateway_show");
      const result = await tool.handler({ gateway_token: "FakeGWToken_abc123" }, { transport });
      expect(result).toEqual(fakeGateway());
      expect(calls[0].path).toBe("/gateways/FakeGWToken_abc123.json");
    });
  });

  describe("spreedly_gateway_update", () => {
    it("updates a gateway", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["PUT /gateways/FakeGWToken_abc123.json", { data: fakeGateway() }]]),
      );
      const tool = findTool("spreedly_gateway_update");
      await tool.handler(
        { gateway_token: "FakeGWToken_abc123", credentials: { login: "new" } },
        { transport },
      );
      expect(calls[0].method).toBe("PUT");
      expect(calls[0].options?.body).toEqual({ gateway: { login: "new" } });
    });
  });

  describe("spreedly_gateway_retain", () => {
    it("retains a gateway", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["PUT /gateways/FakeGWToken_abc123/retain.json", { data: fakeGateway() }]]),
      );
      const tool = findTool("spreedly_gateway_retain");
      await tool.handler({ gateway_token: "FakeGWToken_abc123" }, { transport });
      expect(calls[0].path).toBe("/gateways/FakeGWToken_abc123/retain.json");
    });
  });

  describe("spreedly_gateway_list_supported", () => {
    it("lists supported gateways", async () => {
      const { transport } = createMockTransport(
        new Map([["GET /gateways_options.json", { data: fakeGatewayOptions() }]]),
      );
      const tool = findTool("spreedly_gateway_list_supported");
      const result = await tool.handler({}, { transport });
      expect(result).toEqual(fakeGatewayOptions());
    });
  });

  describe("spreedly_gateway_list_transactions", () => {
    it("lists transactions for a gateway", async () => {
      const { transport } = createMockTransport(
        new Map([
          ["GET /gateways/FakeGWToken_abc123/transactions.json", { data: fakeTransactionList() }],
        ]),
      );
      const tool = findTool("spreedly_gateway_list_transactions");
      const result = await tool.handler({ gateway_token: "FakeGWToken_abc123" }, { transport });
      expect(result).toEqual(fakeTransactionList());
    });
  });

  describe("spreedly_gateway_authorize", () => {
    it("authorizes a payment", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /gateways/FakeGWToken_abc123/authorize.json",
            { data: fakeTransaction({ transaction_type: "Authorization" }) },
          ],
        ]),
      );
      const tool = findTool("spreedly_gateway_authorize");
      await tool.handler(
        {
          gateway_token: "FakeGWToken_abc123",
          payment_method_token: "FakePMToken_pm001",
          amount: 1000,
          currency_code: "USD",
        },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
      expect(calls[0].options?.body).toEqual({
        transaction: {
          payment_method_token: "FakePMToken_pm001",
          amount: 1000,
          currency_code: "USD",
        },
      });
    });
  });

  describe("spreedly_gateway_purchase", () => {
    it("processes a purchase", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["POST /gateways/FakeGWToken_abc123/purchase.json", { data: fakeTransaction() }]]),
      );
      const tool = findTool("spreedly_gateway_purchase");
      await tool.handler(
        {
          gateway_token: "FakeGWToken_abc123",
          payment_method_token: "FakePMToken_pm001",
          amount: 1000,
          currency_code: "USD",
        },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });
  });

  describe("spreedly_gateway_verify", () => {
    it("verifies a payment method", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /gateways/FakeGWToken_abc123/verify.json",
            { data: fakeTransaction({ transaction_type: "Verification" }) },
          ],
        ]),
      );
      const tool = findTool("spreedly_gateway_verify");
      await tool.handler(
        {
          gateway_token: "FakeGWToken_abc123",
          payment_method_token: "FakePMToken_pm001",
          currency_code: "USD",
        },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });
  });

  describe("spreedly_gateway_store", () => {
    it("stores a payment method", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /gateways/FakeGWToken_abc123/store.json",
            { data: fakeTransaction({ transaction_type: "Store" }) },
          ],
        ]),
      );
      const tool = findTool("spreedly_gateway_store");
      await tool.handler(
        { gateway_token: "FakeGWToken_abc123", payment_method_token: "FakePMToken_pm001" },
        { transport },
      );
      expect(calls[0].options?.body).toEqual({
        transaction: { payment_method_token: "FakePMToken_pm001" },
      });
    });
  });

  describe("spreedly_gateway_general_credit", () => {
    it("issues a general credit", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /gateways/FakeGWToken_abc123/general_credit.json",
            { data: fakeTransaction({ transaction_type: "Credit" }) },
          ],
        ]),
      );
      const tool = findTool("spreedly_gateway_general_credit");
      await tool.handler(
        {
          gateway_token: "FakeGWToken_abc123",
          payment_method_token: "FakePMToken_pm001",
          amount: 500,
          currency_code: "USD",
        },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });
  });

  it("has correct number of tools", () => {
    expect(gatewayTools.length).toBe(12);
  });

  it("all tools have descriptions", () => {
    for (const tool of gatewayTools) {
      expect(tool.description).toBeTruthy();
      expect(tool.description.length).toBeGreaterThan(20);
    }
  });

  it("all tool names follow naming convention", () => {
    for (const tool of gatewayTools) {
      expect(tool.name).toMatch(/^spreedly_gateway_/);
    }
  });
});
