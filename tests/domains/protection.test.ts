import { describe, it, expect } from "vitest";
import { protectionTools } from "../../src/domains/protection/tools.js";
import { createMockTransport } from "../helpers/transport.js";

function findTool(name: string) {
  const tool = protectionTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("protection tools", () => {
  it("forwards a claim", async () => {
    const { transport, calls } = createMockTransport(new Map([["POST /protection/FakeTxToken_xyz789/claims.json", { data: { claim: { status: "submitted" } } }]]));
    await findTool("spreedly_protection_forward_claim").handler(
      { transaction_token: "FakeTxToken_xyz789", claim: { reason: "fraud" } },
      { transport },
    );
    expect(calls[0].method).toBe("POST");
  });

  it("lists protection events", async () => {
    const events = { events: [{ token: "ev1", event_type: "protection.check" }] };
    const { transport } = createMockTransport(new Map([["GET /protection/events.json", { data: events }]]));
    const result = await findTool("spreedly_protection_list_events").handler({}, { transport });
    expect(result).toEqual(events);
  });

  it("shows a protection event", async () => {
    const event = { event: { token: "ev1", event_type: "protection.check" } };
    const { transport } = createMockTransport(new Map([["GET /protection/events/ev1.json", { data: event }]]));
    const result = await findTool("spreedly_protection_show_event").handler({ event_token: "ev1" }, { transport });
    expect(result).toEqual(event);
  });

  it("creates a protection provider", async () => {
    const { transport, calls } = createMockTransport(new Map([["POST /protection/providers.json", { data: { protection_provider: { token: "pp1" } } }]]));
    await findTool("spreedly_protection_create_provider").handler({ protection_provider: { type: "test" } }, { transport });
    expect(calls[0].method).toBe("POST");
  });

  it("shows a protection provider", async () => {
    const provider = { protection_provider: { token: "pp1" } };
    const { transport } = createMockTransport(new Map([["GET /protection/providers/pp1.json", { data: provider }]]));
    const result = await findTool("spreedly_protection_show_provider").handler({ protection_provider_token: "pp1" }, { transport });
    expect(result).toEqual(provider);
  });

  it("has correct number of tools", () => {
    expect(protectionTools.length).toBe(5);
  });
});
