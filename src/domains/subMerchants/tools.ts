import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateSubMerchantSchema,
  ListSubMerchantsSchema,
  ShowSubMerchantSchema,
  UpdateSubMerchantSchema,
} from "./schemas.js";

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
      const { since_token, order, count } = params as {
        since_token?: string;
        order?: string;
        count?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/sub_merchants.json", { query: { since_token, order, count } }),
      );
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
      const res = await transport.request(
        "GET",
        buildUrl("/sub_merchants/:sub_merchant_key.json", { path: { sub_merchant_key } }),
      );
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
      const res = await transport.request(
        "PUT",
        buildUrl("/sub_merchants/:sub_merchant_key.json", { path: { sub_merchant_key } }),
        {
          body: { sub_merchant },
        },
      );
      return res.data;
    },
  },
];
