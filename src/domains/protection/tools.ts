import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  ForwardClaimSchema,
  ListProtectionEventsSchema,
  ShowProtectionEventSchema,
  CreateProtectionProviderSchema,
  ShowProtectionProviderSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const protectionTools: ToolDefinition[] = [
  {
    name: "spreedly_protection_forward_claim",
    description: TOOL_DESCRIPTIONS.spreedly_protection_forward_claim,
    schema: ForwardClaimSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, claim } = params as {
        transaction_token: string;
        claim: Record<string, unknown>;
      };
      const res = await transport.request("POST", `/protection/${transaction_token}/claims.json`, {
        body: { claim },
      });
      return res.data;
    },
  },
  {
    name: "spreedly_protection_list_events",
    description: TOOL_DESCRIPTIONS.spreedly_protection_list_events,
    schema: ListProtectionEventsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/protection/events.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_protection_show_event",
    description: TOOL_DESCRIPTIONS.spreedly_protection_show_event,
    schema: ShowProtectionEventSchema.shape,
    handler: async (params, { transport }) => {
      const { event_token } = params as { event_token: string };
      const res = await transport.request("GET", `/protection/events/${event_token}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_protection_create_provider",
    description: TOOL_DESCRIPTIONS.spreedly_protection_create_provider,
    schema: CreateProtectionProviderSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/protection/providers.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_protection_show_provider",
    description: TOOL_DESCRIPTIONS.spreedly_protection_show_provider,
    schema: ShowProtectionProviderSchema.shape,
    handler: async (params, { transport }) => {
      const { protection_provider_token } = params as { protection_provider_token: string };
      const res = await transport.request(
        "GET",
        `/protection/providers/${protection_provider_token}.json`,
      );
      return res.data;
    },
  },
];
