import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CardRefresherInquirySchema,
  ShowCardRefresherInquirySchema,
  ListCardRefresherInquiriesSchema,
} from "./schemas.js";

export const cardRefresherTools: ToolDefinition[] = [
  {
    name: "spreedly_card_refresher_inquiry",
    description: TOOL_DESCRIPTIONS.spreedly_card_refresher_inquiry,
    // Open world: reaches card networks outside Spreedly to refresh card data
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
    schema: CardRefresherInquirySchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/card_refresher/inquiry.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_card_refresher_show_inquiry",
    description: TOOL_DESCRIPTIONS.spreedly_card_refresher_show_inquiry,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowCardRefresherInquirySchema.shape,
    handler: async (params, { transport }) => {
      const { inquiry_token } = params as { inquiry_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/card_refresher/inquiry/:inquiry_token.json", { path: { inquiry_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_card_refresher_list_inquiries",
    description: TOOL_DESCRIPTIONS.spreedly_card_refresher_list_inquiries,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListCardRefresherInquiriesSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order, count } = params as {
        since_token?: string;
        order?: string;
        count?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/card_refresher/inquiries.json", { query: { since_token, order, count } }),
      );
      return res.data;
    },
  },
];
