import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  ScaAuthenticateSchema,
  CreateScaProviderSchema,
  ShowScaProviderSchema,
} from "./schemas.js";

export const scaTools: ToolDefinition[] = [
  {
    name: "spreedly_sca_authenticate",
    description: TOOL_DESCRIPTIONS.spreedly_sca_authenticate,
    schema: ScaAuthenticateSchema.shape,
    handler: async (params, { transport }) => {
      const { sca_provider_key, ...body } = params as Record<string, unknown> & { sca_provider_key: string };
      const res = await transport.request("POST", `/sca/providers/${sca_provider_key}/authenticate.json`, { body });
      return res.data;
    },
  },
  {
    name: "spreedly_sca_create_provider",
    description: TOOL_DESCRIPTIONS.spreedly_sca_create_provider,
    schema: CreateScaProviderSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/sca/providers.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_sca_show_provider",
    description: TOOL_DESCRIPTIONS.spreedly_sca_show_provider,
    schema: ShowScaProviderSchema.shape,
    handler: async (params, { transport }) => {
      const { sca_provider_token } = params as { sca_provider_token: string };
      const res = await transport.request("GET", `/sca/providers/${sca_provider_token}.json`);
      return res.data;
    },
  },
];
