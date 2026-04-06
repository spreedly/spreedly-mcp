import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateEnvironmentSchema,
  ListEnvironmentsSchema,
  ShowEnvironmentSchema,
  UpdateEnvironmentSchema,
} from "./schemas.js";

export const environmentTools: ToolDefinition[] = [
  {
    name: "spreedly_environment_create",
    description: TOOL_DESCRIPTIONS.spreedly_environment_create,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreateEnvironmentSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/environments.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_environment_list",
    description: TOOL_DESCRIPTIONS.spreedly_environment_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListEnvironmentsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order, count } = params as {
        since_token?: string;
        order?: string;
        count?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/environments.json", { query: { since_token, order, count } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_environment_show",
    description: TOOL_DESCRIPTIONS.spreedly_environment_show,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowEnvironmentSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key } = params as { environment_key: string };
      const res = await transport.request(
        "GET",
        buildUrl("/environments/:environment_key.json", { path: { environment_key } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_environment_update",
    description: TOOL_DESCRIPTIONS.spreedly_environment_update,
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdateEnvironmentSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key, environment } = params as {
        environment_key: string;
        environment: Record<string, unknown>;
      };
      const res = await transport.request(
        "PUT",
        buildUrl("/environments/:environment_key.json", { path: { environment_key } }),
        {
          body: { environment },
        },
      );
      return res.data;
    },
  },
];
