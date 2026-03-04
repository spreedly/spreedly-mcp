import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import { CardMetadataSchema, TokenStatusSchema } from "./schemas.js";

export const networkTokenizationTools: ToolDefinition[] = [
  {
    name: "spreedly_network_tokenization_card_metadata",
    description: TOOL_DESCRIPTIONS.spreedly_network_tokenization_card_metadata,
    schema: CardMetadataSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token } = params as { payment_method_token: string };
      const res = await transport.request("GET", `/network_tokenization/card_metadata.json?payment_method_token=${encodeURIComponent(payment_method_token)}`);
      return res.data;
    },
  },
  {
    name: "spreedly_network_tokenization_token_status",
    description: TOOL_DESCRIPTIONS.spreedly_network_tokenization_token_status,
    schema: TokenStatusSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token } = params as { payment_method_token: string };
      const res = await transport.request("GET", `/network_tokenization/token_status.json?payment_method_token=${encodeURIComponent(payment_method_token)}`);
      return res.data;
    },
  },
];
