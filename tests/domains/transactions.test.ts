import { describe, it, expect } from "vitest";
import { transactionTools } from "../../src/domains/transactions/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakeTransaction, fakeTransactionList } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = transactionTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("transaction tools", () => {
  describe("spreedly_transaction_list", () => {
    it("lists transactions", async () => {
      const { transport } = createMockTransport(
        new Map([["GET /transactions.json", { data: fakeTransactionList() }]]),
      );
      const result = await findTool("spreedly_transaction_list").handler({}, { transport });
      expect(result).toEqual(fakeTransactionList());
    });
  });

  describe("spreedly_transaction_show", () => {
    it("shows a transaction", async () => {
      const { transport } = createMockTransport(
        new Map([["GET /transactions/FakeTxToken_xyz789.json", { data: fakeTransaction() }]]),
      );
      const result = await findTool("spreedly_transaction_show").handler(
        { transaction_token: "FakeTxToken_xyz789" },
        { transport },
      );
      expect(result).toEqual(fakeTransaction());
    });
  });

  describe("spreedly_transaction_capture", () => {
    it("captures full amount", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /transactions/FakeTxToken_xyz789/capture.json",
            { data: fakeTransaction({ transaction_type: "Capture" }) },
          ],
        ]),
      );
      await findTool("spreedly_transaction_capture").handler(
        { transaction_token: "FakeTxToken_xyz789" },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });

    it("captures partial amount", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /transactions/FakeTxToken_xyz789/capture.json",
            { data: fakeTransaction({ amount: 500 }) },
          ],
        ]),
      );
      await findTool("spreedly_transaction_capture").handler(
        { transaction_token: "FakeTxToken_xyz789", amount: 500 },
        { transport },
      );
      expect(calls[0].options?.body).toEqual({ transaction: { amount: 500 } });
    });
  });

  describe("spreedly_transaction_void", () => {
    it("voids a transaction", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /transactions/FakeTxToken_xyz789/void.json",
            { data: fakeTransaction({ transaction_type: "Void" }) },
          ],
        ]),
      );
      await findTool("spreedly_transaction_void").handler(
        { transaction_token: "FakeTxToken_xyz789" },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });
  });

  describe("spreedly_transaction_credit", () => {
    it("refunds a transaction", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /transactions/FakeTxToken_xyz789/credit.json",
            { data: fakeTransaction({ transaction_type: "Credit" }) },
          ],
        ]),
      );
      await findTool("spreedly_transaction_credit").handler(
        { transaction_token: "FakeTxToken_xyz789" },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });
  });

  describe("spreedly_transaction_transcript", () => {
    it("gets transaction transcript", async () => {
      const { transport } = createMockTransport(
        new Map([
          [
            "GET /transactions/FakeTxToken_xyz789/transcript",
            { data: "Request: ...\nResponse: ..." },
          ],
        ]),
      );
      const result = await findTool("spreedly_transaction_transcript").handler(
        { transaction_token: "FakeTxToken_xyz789" },
        { transport },
      );
      expect(result).toContain("Request");
    });
  });

  describe("spreedly_transaction_authorize_workflow", () => {
    it("creates workflow authorization", async () => {
      const { transport, calls } = createMockTransport(
        new Map([
          [
            "POST /transactions/authorize.json",
            { data: fakeTransaction({ transaction_type: "Authorization" }) },
          ],
        ]),
      );
      await findTool("spreedly_transaction_authorize_workflow").handler(
        { payment_method_token: "FakePMToken_pm001", amount: 1000, currency_code: "USD" },
        { transport },
      );
      expect(calls[0].options?.body).toEqual({
        transaction: {
          payment_method_token: "FakePMToken_pm001",
          amount: 1000,
          currency_code: "USD",
        },
      });
    });
  });

  describe("spreedly_transaction_purchase_workflow", () => {
    it("creates workflow purchase", async () => {
      const { transport, calls } = createMockTransport(
        new Map([["POST /transactions/purchase.json", { data: fakeTransaction() }]]),
      );
      await findTool("spreedly_transaction_purchase_workflow").handler(
        { payment_method_token: "FakePMToken_pm001", amount: 2000, currency_code: "EUR" },
        { transport },
      );
      expect(calls[0].method).toBe("POST");
    });
  });

  it("has correct number of tools", () => {
    expect(transactionTools.length).toBe(12);
  });

  it("all tool names follow naming convention", () => {
    for (const tool of transactionTools) {
      expect(tool.name).toMatch(/^spreedly_transaction_/);
    }
  });
});
