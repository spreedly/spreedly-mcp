import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateReceiverSchema,
  ListReceiversSchema,
  ShowReceiverSchema,
  UpdateReceiverSchema,
  RedactReceiverSchema,
  DeliverReceiverSchema,
  ExportReceiverSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const receiverTools: ToolDefinition[] = [
  {
    name: "spreedly_receiver_list_supported",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_list_supported,
    schema: {},
    handler: async (_params, { transport }) => {
      const res = await transport.request("GET", "/receivers_options.json");
      return res.data;
    },
  },
  {
    name: "spreedly_receiver_create",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_create,
    schema: CreateReceiverSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/receivers.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_receiver_list",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_list,
    schema: ListReceiversSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order } = params as { since_token?: string; order?: string };
      const query = buildQuery({ since_token, order });
      const res = await transport.request("GET", `/receivers.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_receiver_show",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_show,
    schema: ShowReceiverSchema.shape,
    handler: async (params, { transport }) => {
      const { receiver_token } = params as { receiver_token: string };
      const res = await transport.request("GET", `/receivers/${receiver_token}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_receiver_update",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_update,
    schema: UpdateReceiverSchema.shape,
    handler: async (params, { transport }) => {
      const { receiver_token, receiver } = params as { receiver_token: string; receiver: Record<string, unknown> };
      const res = await transport.request("PUT", `/receivers/${receiver_token}.json`, { body: { receiver } });
      return res.data;
    },
  },
  {
    name: "spreedly_receiver_redact",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_redact,
    schema: RedactReceiverSchema.shape,
    handler: async (params, { transport }) => {
      const { receiver_token } = params as { receiver_token: string };
      const res = await transport.request("PUT", `/receivers/${receiver_token}/redact.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_receiver_deliver",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_deliver,
    schema: DeliverReceiverSchema.shape,
    handler: async (params, { transport }) => {
      const { receiver_token, ...delivery } = params as Record<string, unknown> & { receiver_token: string };
      const body = { delivery };
      const res = await transport.request("POST", `/receivers/${receiver_token}/deliver.json`, { body });
      return res.data;
    },
  },
  {
    name: "spreedly_receiver_export",
    description: TOOL_DESCRIPTIONS.spreedly_receiver_export,
    schema: ExportReceiverSchema.shape,
    handler: async (params, { transport }) => {
      const { receiver_token, payment_method_token } = params as { receiver_token: string; payment_method_token: string };
      const body = { export: { payment_method_token } };
      const res = await transport.request("POST", `/receivers/${receiver_token}/export.json`, { body });
      return res.data;
    },
  },
];
