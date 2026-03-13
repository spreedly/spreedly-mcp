import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateMerchantProfileSchema,
  ListMerchantProfilesSchema,
  ShowMerchantProfileSchema,
  UpdateMerchantProfileSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const merchantProfileTools: ToolDefinition[] = [
  {
    name: "spreedly_merchant_profile_create",
    description: TOOL_DESCRIPTIONS.spreedly_merchant_profile_create,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreateMerchantProfileSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/merchant_profiles.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_merchant_profile_list",
    description: TOOL_DESCRIPTIONS.spreedly_merchant_profile_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListMerchantProfilesSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/merchant_profiles.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_merchant_profile_show",
    description: TOOL_DESCRIPTIONS.spreedly_merchant_profile_show,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowMerchantProfileSchema.shape,
    handler: async (params, { transport }) => {
      const { merchant_profile_token } = params as { merchant_profile_token: string };
      const res = await transport.request(
        "GET",
        `/merchant_profiles/${merchant_profile_token}.json`,
      );
      return res.data;
    },
  },
  {
    name: "spreedly_merchant_profile_update",
    description: TOOL_DESCRIPTIONS.spreedly_merchant_profile_update,
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdateMerchantProfileSchema.shape,
    handler: async (params, { transport }) => {
      const { merchant_profile_token, merchant_profile } = params as {
        merchant_profile_token: string;
        merchant_profile: Record<string, unknown>;
      };
      const res = await transport.request(
        "PUT",
        `/merchant_profiles/${merchant_profile_token}.json`,
        { body: { merchant_profile } },
      );
      return res.data;
    },
  },
];
