import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import { ListEventsSchema, ShowEventSchema } from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const eventTools: ToolDefinition[] = [
  {
    name: "spreedly_event_list",
    description: TOOL_DESCRIPTIONS.spreedly_event_list,
    schema: ListEventsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/events.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_event_show",
    description: TOOL_DESCRIPTIONS.spreedly_event_show,
    schema: ShowEventSchema.shape,
    handler: async (params, { transport }) => {
      const { event_id } = params as { event_id: string };
      const res = await transport.request("GET", `/events/${event_id}.json`);
      return res.data;
    },
  },
];
