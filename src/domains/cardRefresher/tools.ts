import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CardRefresherInquirySchema,
  ShowCardRefresherInquirySchema,
  ListCardRefresherInquiriesSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const cardRefresherTools: ToolDefinition[] = [
  {
    name: "spreedly_card_refresher_inquiry",
    description: TOOL_DESCRIPTIONS.spreedly_card_refresher_inquiry,
    schema: CardRefresherInquirySchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/card_refresher/inquiry.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_card_refresher_show_inquiry",
    description: TOOL_DESCRIPTIONS.spreedly_card_refresher_show_inquiry,
    schema: ShowCardRefresherInquirySchema.shape,
    handler: async (params, { transport }) => {
      const { inquiry_token } = params as { inquiry_token: string };
      const res = await transport.request("GET", `/card_refresher/inquiry/${inquiry_token}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_card_refresher_list_inquiries",
    description: TOOL_DESCRIPTIONS.spreedly_card_refresher_list_inquiries,
    schema: ListCardRefresherInquiriesSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/card_refresher/inquiries.json${query}`);
      return res.data;
    },
  },
];
