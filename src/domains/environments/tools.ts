import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateEnvironmentSchema,
  ListEnvironmentsSchema,
  ShowEnvironmentSchema,
  UpdateEnvironmentSchema,
  CreateAccessSecretSchema,
  ListAccessSecretsSchema,
  ShowAccessSecretSchema,
  DeleteAccessSecretSchema,
  RegenerateSigningSecretSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const environmentTools: ToolDefinition[] = [
  {
    name: "spreedly_environment_create",
    description: TOOL_DESCRIPTIONS.spreedly_environment_create,
    schema: CreateEnvironmentSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/environments.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_environment_list",
    description: TOOL_DESCRIPTIONS.spreedly_environment_list,
    schema: ListEnvironmentsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/environments.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_environment_show",
    description: TOOL_DESCRIPTIONS.spreedly_environment_show,
    schema: ShowEnvironmentSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key } = params as { environment_key: string };
      const res = await transport.request("GET", `/environments/${environment_key}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_environment_update",
    description: TOOL_DESCRIPTIONS.spreedly_environment_update,
    schema: UpdateEnvironmentSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key, environment } = params as { environment_key: string; environment: Record<string, unknown> };
      const res = await transport.request("PUT", `/environments/${environment_key}.json`, { body: { environment } });
      return res.data;
    },
  },
  {
    name: "spreedly_environment_create_access_secret",
    description: TOOL_DESCRIPTIONS.spreedly_environment_create_access_secret,
    schema: CreateAccessSecretSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key } = params as { environment_key: string };
      const res = await transport.request("POST", `/environments/${environment_key}/access_secrets.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_environment_list_access_secrets",
    description: TOOL_DESCRIPTIONS.spreedly_environment_list_access_secrets,
    schema: ListAccessSecretsSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key } = params as { environment_key: string };
      const res = await transport.request("GET", `/environments/${environment_key}/access_secrets.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_environment_show_access_secret",
    description: TOOL_DESCRIPTIONS.spreedly_environment_show_access_secret,
    schema: ShowAccessSecretSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key, access_secret_key } = params as { environment_key: string; access_secret_key: string };
      const res = await transport.request("GET", `/environments/${environment_key}/access_secrets/${access_secret_key}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_environment_delete_access_secret",
    description: TOOL_DESCRIPTIONS.spreedly_environment_delete_access_secret,
    schema: DeleteAccessSecretSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key, access_secret_key } = params as { environment_key: string; access_secret_key: string };
      const res = await transport.request("DELETE", `/environments/${environment_key}/access_secrets/${access_secret_key}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_environment_regenerate_signing_secret",
    description: TOOL_DESCRIPTIONS.spreedly_environment_regenerate_signing_secret,
    schema: RegenerateSigningSecretSchema.shape,
    handler: async (params, { transport }) => {
      const { environment_key } = params as { environment_key: string };
      const res = await transport.request("POST", `/environments/${environment_key}/regenerate_signing_secret.json`);
      return res.data;
    },
  },
];
