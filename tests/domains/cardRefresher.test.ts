import { describe, it, expect } from "vitest";
import { cardRefresherTools } from "../../src/domains/cardRefresher/tools.js";
import { createMockTransport } from "../helpers/transport.js";

function findTool(name: string) {
  const tool = cardRefresherTools.find((t) => t.name === name);
  if (!tool) throw new Error(`Tool ${name} not found`);
  return tool;
}

describe("card refresher tools", () => {
  it("submits a card refresher inquiry", async () => {
    const { transport, calls } = createMockTransport(
      new Map([["POST /card_refresher/inquiry.json", { data: { inquiry: { token: "inq1" } } }]]),
    );
    await findTool("spreedly_card_refresher_inquiry").handler(
      {
        card_refresher_inquiry: {
          region: "NA",
          payment_method_token: "FakePMToken_001",
          updating_service: "visa_au",
        },
      },
      { transport },
    );
    expect(calls[0].method).toBe("POST");
  });

  it("shows a card refresher inquiry", async () => {
    const inquiry = { inquiry: { token: "inq1", state: "completed" } };
    const { transport } = createMockTransport(
      new Map([["GET /card_refresher/inquiry/inq1.json", { data: inquiry }]]),
    );
    const result = await findTool("spreedly_card_refresher_show_inquiry").handler(
      { inquiry_token: "inq1" },
      { transport },
    );
    expect(result).toEqual(inquiry);
  });

  it("lists card refresher inquiries", async () => {
    const list = { inquiries: [{ token: "inq1" }, { token: "inq2" }] };
    const { transport } = createMockTransport(
      new Map([["GET /card_refresher/inquiries.json", { data: list }]]),
    );
    const result = await findTool("spreedly_card_refresher_list_inquiries").handler(
      {},
      { transport },
    );
    expect(result).toEqual(list);
  });

  it("has correct number of tools", () => {
    expect(cardRefresherTools.length).toBe(3);
  });
});
