import { describe, it, expect } from "vitest";
import { eventTools } from "../../src/domains/events/tools.js";
import { createMockTransport } from "../helpers/transport.js";
import { fakeEvent } from "../helpers/fixtures.js";

function findTool(name: string) {
  const tool = eventTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("event tools", () => {
  it("lists events", async () => {
    const list = { events: [fakeEvent().event] };
    const { transport } = createMockTransport(new Map([["GET /events.json", { data: list }]]));
    const result = await findTool("spreedly_event_list").handler({}, { transport });
    expect(result).toEqual(list);
  });

  it("shows an event", async () => {
    const { transport } = createMockTransport(
      new Map([["GET /events/123.json", { data: fakeEvent() }]]),
    );
    const result = await findTool("spreedly_event_show").handler(
      { event_id: "123" },
      { transport },
    );
    expect(result).toEqual(fakeEvent());
  });

  it("has correct number of tools", () => {
    expect(eventTools.length).toBe(2);
  });
});
