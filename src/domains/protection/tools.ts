import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  ForwardClaimSchema,
  ListProtectionEventsSchema,
  ShowProtectionEventSchema,
  CreateProtectionProviderSchema,
  ShowProtectionProviderSchema,
} from "./schemas.js";

export const protectionTools: ToolDefinition[] = [
  {
    name: "spreedly_protection_forward_claim",
    description: TOOL_DESCRIPTIONS.spreedly_protection_forward_claim,
    // Open world: forwards to an external protection provider
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
    schema: ForwardClaimSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, claim } = params as {
        transaction_token: string;
        claim: Record<string, unknown>;
      };
      const res = await transport.request(
        "POST",
        buildUrl("/protection/:transaction_token/claims.json", { path: { transaction_token } }),
        {
          body: { claim },
        },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_protection_list_events",
    description: TOOL_DESCRIPTIONS.spreedly_protection_list_events,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListProtectionEventsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order, count, state } = params as {
        since_token?: string;
        order?: string;
        count?: string;
        state?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/protection/events.json", { query: { since_token, order, count, state } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_protection_show_event",
    description: TOOL_DESCRIPTIONS.spreedly_protection_show_event,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowProtectionEventSchema.shape,
    handler: async (params, { transport }) => {
      const { event_token } = params as { event_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/protection/events/:event_token.json", { path: { event_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_protection_create_provider",
    description: TOOL_DESCRIPTIONS.spreedly_protection_create_provider,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreateProtectionProviderSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/protection/providers.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_protection_show_provider",
    description: TOOL_DESCRIPTIONS.spreedly_protection_show_provider,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowProtectionProviderSchema.shape,
    handler: async (params, { transport }) => {
      const { protection_provider_token } = params as { protection_provider_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/protection/providers/:protection_provider_token.json", {
          path: { protection_provider_token },
        }),
      );
      return res.data;
    },
  },
];
