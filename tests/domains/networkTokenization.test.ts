import { describe, it, expect } from "vitest";
import { networkTokenizationTools } from "../../src/domains/networkTokenization/tools.js";
import { createMockTransport } from "../helpers/transport.js";

function findTool(name: string) {
  const tool = networkTokenizationTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("network tokenization tools", () => {
  it("gets card metadata", async () => {
    const metadata = { card_metadata: { brand: "visa", country: "US" } };
    const { transport, calls } = createMockTransport(
      new Map([["GET /network_tokenization/card_metadata.json", { data: metadata }]]),
    );
    const result = await findTool("spreedly_network_tokenization_card_metadata").handler(
      { payment_method_token: "FakePMToken_pm001" },
      { transport },
    );
    expect(result).toEqual(metadata);
    expect(calls[0].path).toBe(
      "/network_tokenization/card_metadata.json?payment_method_token=FakePMToken_pm001",
    );
  });

  it("gets token status", async () => {
    const status = { token_status: { state: "active" } };
    const { transport, calls } = createMockTransport(
      new Map([["GET /network_tokenization/token_status.json", { data: status }]]),
    );
    const result = await findTool("spreedly_network_tokenization_token_status").handler(
      { payment_method_token: "FakePMToken/pm001#frag" },
      { transport },
    );
    expect(result).toEqual(status);
    expect(calls[0].path).toBe(
      "/network_tokenization/token_status.json?payment_method_token=FakePMToken%2Fpm001%23frag",
    );
  });

  it("has correct number of tools", () => {
    expect(networkTokenizationTools.length).toBe(2);
  });
});
