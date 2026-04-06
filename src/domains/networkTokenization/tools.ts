import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import { CardMetadataSchema, TokenStatusSchema } from "./schemas.js";

export const networkTokenizationTools: ToolDefinition[] = [
  {
    name: "spreedly_network_tokenization_card_metadata",
    description: TOOL_DESCRIPTIONS.spreedly_network_tokenization_card_metadata,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: CardMetadataSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token } = params as { payment_method_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/network_tokenization/card_metadata.json", {
          query: { payment_method_token },
        }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_network_tokenization_token_status",
    description: TOOL_DESCRIPTIONS.spreedly_network_tokenization_token_status,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: TokenStatusSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token } = params as { payment_method_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/network_tokenization/token_status.json", {
          query: { payment_method_token },
        }),
      );
      return res.data;
    },
  },
];
