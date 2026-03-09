import { describe, it, expect } from "vitest";
import { scaTools } from "../../src/domains/sca/tools.js";
import { createMockTransport } from "../helpers/transport.js";

function findTool(name: string) {
  const tool = scaTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("SCA tools", () => {
  it("authenticates via SCA provider", async () => {
    const { transport, calls } = createMockTransport(
      new Map([
        [
          "POST /sca/providers/sca_key_1/authenticate.json",
          { data: { authentication: { state: "succeeded" } } },
        ],
      ]),
    );
    await findTool("spreedly_sca_authenticate").handler(
      { sca_provider_key: "sca_key_1", payment_method_token: "FakePMToken_pm001" },
      { transport },
    );
    expect(calls[0].method).toBe("POST");
  });

  it("creates an SCA provider", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["POST /sca/providers.json", { data: { sca_provider: { token: "sca1" } } }]]),
    );
    await findTool("spreedly_sca_create_provider").handler(
      { sca_provider: { type: "test" } },
      { transport },
    );
    expect(calls[0].method).toBe("POST");
  });

  it("shows an SCA provider", async () => {
    const provider = { sca_provider: { token: "sca1" } };
    const { transport } = createMockTransport(
      new Map([["GET /sca/providers/sca1.json", { data: provider }]]),
    );
    const result = await findTool("spreedly_sca_show_provider").handler(
      { sca_provider_token: "sca1" },
      { transport },
    );
    expect(result).toEqual(provider);
  });

  it("has correct number of tools", () => {
    expect(scaTools.length).toBe(3);
  });
});
