import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
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
    // Open world: initiates 3DS flow at an external SCA provider
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
    schema: ScaAuthenticateSchema.shape,
    handler: async (params, { transport }) => {
      const { sca_provider_key, ...txnParams } = params as Record<string, unknown> & {
        sca_provider_key: string;
      };
      const body = { transaction: txnParams };
      const res = await transport.request(
        "POST",
        buildUrl("/sca/providers/:sca_provider_key/authenticate.json", {
          path: { sca_provider_key },
        }),
        { body },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_sca_create_provider",
    description: TOOL_DESCRIPTIONS.spreedly_sca_create_provider,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreateScaProviderSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/sca/providers.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_sca_show_provider",
    description: TOOL_DESCRIPTIONS.spreedly_sca_show_provider,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowScaProviderSchema.shape,
    handler: async (params, { transport }) => {
      const { sca_provider_token } = params as { sca_provider_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/sca/providers/:sca_provider_token.json", { path: { sca_provider_token } }),
      );
      return res.data;
    },
  },
];
