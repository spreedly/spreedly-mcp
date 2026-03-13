import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateSubMerchantSchema,
  ListSubMerchantsSchema,
  ShowSubMerchantSchema,
  UpdateSubMerchantSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const subMerchantTools: ToolDefinition[] = [
  {
    name: "spreedly_sub_merchant_create",
    description: TOOL_DESCRIPTIONS.spreedly_sub_merchant_create,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreateSubMerchantSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/sub_merchants.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_sub_merchant_list",
    description: TOOL_DESCRIPTIONS.spreedly_sub_merchant_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListSubMerchantsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/sub_merchants.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_sub_merchant_show",
    description: TOOL_DESCRIPTIONS.spreedly_sub_merchant_show,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowSubMerchantSchema.shape,
    handler: async (params, { transport }) => {
      const { sub_merchant_key } = params as { sub_merchant_key: string };
      const res = await transport.request("GET", `/sub_merchants/${sub_merchant_key}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_sub_merchant_update",
    description: TOOL_DESCRIPTIONS.spreedly_sub_merchant_update,
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdateSubMerchantSchema.shape,
    handler: async (params, { transport }) => {
      const { sub_merchant_key, sub_merchant } = params as {
        sub_merchant_key: string;
        sub_merchant: Record<string, unknown>;
      };
      const res = await transport.request("PUT", `/sub_merchants/${sub_merchant_key}.json`, {
        body: { sub_merchant },
      });
      return res.data;
    },
  },
];
