import { describe, it, expect } from "vitest";
import { receiverTools } from "../../src/domains/receivers/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakeReceiver } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = receiverTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("receiver tools", () => {
  it("lists supported receivers", async () => {
    const options = { receivers: [{ receiver_type: "test" }] };
    const { transport } = createMockTransport(new Map([["GET /receivers_options.json", { data: options }]]));
    const result = await findTool("spreedly_receiver_list_supported").handler({}, { transport });
    expect(result).toEqual(options);
  });

  it("creates a receiver", async () => {
    const { transport, calls } = createMockTransport(new Map([["POST /receivers.json", { data: fakeReceiver() }]]));
    await findTool("spreedly_receiver_create").handler({ receiver: { receiver_type: "test" } }, { transport });
    expect(calls[0].method).toBe("POST");
  });

  it("lists receivers", async () => {
    const list = { receivers: [fakeReceiver().receiver] };
    const { transport } = createMockTransport(new Map([["GET /receivers.json", { data: list }]]));
    const result = await findTool("spreedly_receiver_list").handler({}, { transport });
    expect(result).toEqual(list);
  });

  it("shows a receiver", async () => {
    const { transport } = createMockTransport(new Map([["GET /receivers/FakeRXToken_rx001.json", { data: fakeReceiver() }]]));
    const result = await findTool("spreedly_receiver_show").handler({ receiver_token: "FakeRXToken_rx001" }, { transport });
    expect(result).toEqual(fakeReceiver());
  });

  it("redacts a receiver", async () => {
    const { transport, calls } = createMockTransport(new Map([["PUT /receivers/FakeRXToken_rx001/redact.json", { data: fakeReceiver({ state: "redacted" }) }]]));
    await findTool("spreedly_receiver_redact").handler({ receiver_token: "FakeRXToken_rx001" }, { transport });
    expect(calls[0].path).toBe("/receivers/FakeRXToken_rx001/redact.json");
  });

  it("delivers to a receiver", async () => {
    const { transport, calls } = createMockTransport(new Map([["POST /receivers/FakeRXToken_rx001/deliver.json", { data: { transaction: { succeeded: true } } }]]));
    await findTool("spreedly_receiver_deliver").handler(
      { receiver_token: "FakeRXToken_rx001", payment_method_token: "FakePMToken_pm001", url: "https://example.com", body: "{}" },
      { transport },
    );
    expect(calls[0].method).toBe("POST");
  });

  it("has correct number of tools", () => {
    expect(receiverTools.length).toBe(8);
  });

  it("all tool names follow naming convention", () => {
    for (const tool of receiverTools) {
      expect(tool.name).toMatch(/^spreedly_receiver_/);
    }
  });
});
