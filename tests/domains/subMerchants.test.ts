import { describe, it, expect } from "vitest";
import { subMerchantTools } from "../../src/domains/subMerchants/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakeSubMerchant } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = subMerchantTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("sub-merchant tools", () => {
  it("creates a sub-merchant", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["POST /sub_merchants.json", { data: fakeSubMerchant() }]]),
    );
    await findTool("spreedly_sub_merchant_create").handler(
      { sub_merchant: { name: "Test" } },
      { transport },
    );
    expect(calls[0].method).toBe("POST");
  });

  it("lists sub-merchants", async () => {
    const list = { sub_merchants: [fakeSubMerchant().sub_merchant] };
    const { transport } = createMockTransport(
      new Map([["GET /sub_merchants.json", { data: list }]]),
    );
    const result = await findTool("spreedly_sub_merchant_list").handler({}, { transport });
    expect(result).toEqual(list);
  });

  it("shows a sub-merchant", async () => {
    const { transport } = createMockTransport(
      new Map([["GET /sub_merchants/FakeSMKey_sm001.json", { data: fakeSubMerchant() }]]),
    );
    const result = await findTool("spreedly_sub_merchant_show").handler(
      { sub_merchant_key: "FakeSMKey_sm001" },
      { transport },
    );
    expect(result).toEqual(fakeSubMerchant());
  });

  it("updates a sub-merchant", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["PUT /sub_merchants/FakeSMKey_sm001.json", { data: fakeSubMerchant() }]]),
    );
    await findTool("spreedly_sub_merchant_update").handler(
      { sub_merchant_key: "FakeSMKey_sm001", sub_merchant: { name: "Updated" } },
      { transport },
    );
    expect(calls[0].method).toBe("PUT");
  });

  it("has correct number of tools", () => {
    expect(subMerchantTools.length).toBe(4);
  });
});
