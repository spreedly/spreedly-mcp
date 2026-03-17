import { describe, it, expect } from "vitest";
import { merchantProfileTools } from "../../src/domains/merchantProfiles/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakeMerchantProfile } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = merchantProfileTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("merchant profile tools", () => {
  it("creates a merchant profile", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["POST /merchant_profiles.json", { data: fakeMerchantProfile() }]]),
    );
    await findTool("spreedly_merchant_profile_create").handler(
      {
        merchant_profile: {
          visa: {
            acquirer_merchant_id: "test_merchant_id",
            mcc: "1234",
            merchant_name: "test merchant",
            country_code: "581",
          },
          description: "Test 01",
        },
      },
      { transport },
    );
    expect(calls[0].method).toBe("POST");
  });

  it("lists merchant profiles", async () => {
    const list = { merchant_profiles: [fakeMerchantProfile().merchant_profile] };
    const { transport } = createMockTransport(
      new Map([["GET /merchant_profiles.json", { data: list }]]),
    );
    const result = await findTool("spreedly_merchant_profile_list").handler({}, { transport });
    expect(result).toEqual(list);
  });

  it("shows a merchant profile", async () => {
    const { transport } = createMockTransport(
      new Map([["GET /merchant_profiles/FakeMPToken_mp001.json", { data: fakeMerchantProfile() }]]),
    );
    const result = await findTool("spreedly_merchant_profile_show").handler(
      { merchant_profile_token: "FakeMPToken_mp001" },
      { transport },
    );
    expect(result).toEqual(fakeMerchantProfile());
  });

  it("updates a merchant profile", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["PUT /merchant_profiles/FakeMPToken_mp001.json", { data: fakeMerchantProfile() }]]),
    );
    await findTool("spreedly_merchant_profile_update").handler(
      { merchant_profile_token: "FakeMPToken_mp001", merchant_profile: { description: "Updated" } },
      { transport },
    );
    expect(calls[0].method).toBe("PUT");
  });

  it("has correct number of tools", () => {
    expect(merchantProfileTools.length).toBe(4);
  });
});
