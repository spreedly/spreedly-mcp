import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreatePaymentMethodSchema,
  ListPaymentMethodsSchema,
  ShowPaymentMethodSchema,
  UpdatePaymentMethodSchema,
  RetainPaymentMethodSchema,
  RecachePaymentMethodSchema,
  ListPaymentMethodTransactionsSchema,
  ListPaymentMethodEventsSchema,
  DeletePaymentMethodMetadataSchema,
  UpdateGratisSchema,
  ShowPaymentMethodEventSchema,
  ListAllPaymentMethodEventsSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const paymentMethodTools: ToolDefinition[] = [
  {
    name: "spreedly_payment_method_create",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_create,
    // Closed world: stores in Spreedly vault only, no external gateway call
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreatePaymentMethodSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/payment_methods.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_list",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListPaymentMethodsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order } = params as { since_token?: string; order?: string };
      const query = buildQuery({ since_token, order });
      const res = await transport.request("GET", `/payment_methods.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_show",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_show,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowPaymentMethodSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token } = params as { payment_method_token: string };
      const res = await transport.request("GET", `/payment_methods/${payment_method_token}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_update",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_update,
    // Destructive: PUT overwrites existing field values (name, email, etc.), not a pure append
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdatePaymentMethodSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token, payment_method } = params as {
        payment_method_token: string;
        payment_method: Record<string, unknown>;
      };
      const res = await transport.request("PUT", `/payment_methods/${payment_method_token}.json`, {
        body: { payment_method },
      });
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_retain",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_retain,
    // Only sets a flag (not destructive); re-retaining is a no-op (idempotent)
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
    schema: RetainPaymentMethodSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token } = params as { payment_method_token: string };
      const res = await transport.request(
        "PUT",
        `/payment_methods/${payment_method_token}/retain.json`,
      );
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_recache",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_recache,
    // Closed world: caches CVV in Spreedly vault, no external gateway call
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: RecachePaymentMethodSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token, payment_method } = params as {
        payment_method_token: string;
        payment_method: Record<string, unknown>;
      };
      const res = await transport.request(
        "POST",
        `/payment_methods/${payment_method_token}/recache.json`,
        { body: { payment_method } },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_list_transactions",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_list_transactions,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListPaymentMethodTransactionsSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token, since_token, order } = params as {
        payment_method_token: string;
        since_token?: string;
        order?: string;
      };
      const query = buildQuery({ since_token, order });
      const res = await transport.request(
        "GET",
        `/payment_methods/${payment_method_token}/transactions.json${query}`,
      );
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_list_events",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_list_events,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListPaymentMethodEventsSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token, since_token } = params as {
        payment_method_token: string;
        since_token?: string;
      };
      const query = buildQuery({ since_token });
      const res = await transport.request(
        "GET",
        `/payment_methods/${payment_method_token}/events.json${query}`,
      );
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_delete_metadata",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_delete_metadata,
    // Idempotent: repeating on a PM with no metadata left is a no-op
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: DeletePaymentMethodMetadataSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token } = params as { payment_method_token: string };
      const res = await transport.request(
        "DELETE",
        `/payment_methods/${payment_method_token}/metadata.json`,
      );
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_update_gratis",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_update_gratis,
    // Destructive: same as payment_method_update — PUT overwrites existing field values
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdateGratisSchema.shape,
    handler: async (params, { transport }) => {
      const { payment_method_token, payment_method } = params as {
        payment_method_token: string;
        payment_method: Record<string, unknown>;
      };
      const res = await transport.request(
        "PUT",
        `/payment_methods/${payment_method_token}/update_gratis.json`,
        { body: { payment_method } },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_show_event",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_show_event,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowPaymentMethodEventSchema.shape,
    handler: async (params, { transport }) => {
      const { event_token } = params as { event_token: string };
      const res = await transport.request("GET", `/payment_methods/events/${event_token}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_list_all_events",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_list_all_events,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListAllPaymentMethodEventsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/payment_methods/events.json${query}`);
      return res.data;
    },
  },
];
