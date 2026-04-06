import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import { ListEventsSchema, ShowEventSchema } from "./schemas.js";

export const eventTools: ToolDefinition[] = [
  {
    name: "spreedly_event_list",
    description: TOOL_DESCRIPTIONS.spreedly_event_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListEventsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order, count, event_type } = params as {
        since_token?: string;
        order?: string;
        count?: string;
        event_type?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/events.json", {
          query: { since_token, order, count, event_type },
        }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_event_show",
    description: TOOL_DESCRIPTIONS.spreedly_event_show,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowEventSchema.shape,
    handler: async (params, { transport }) => {
      const { event_id } = params as { event_id: string };
      const res = await transport.request(
        "GET",
        buildUrl("/events/:event_id.json", { path: { event_id } }),
      );
      return res.data;
    },
  },
];
