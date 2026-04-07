import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
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
      const { since_token, order, metadata, state, count } = params as {
        since_token?: string;
        order?: string;
        metadata?: Record<string, string>;
        state?: string;
        count?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/payment_methods.json", {
          query: { since_token, order, metadata, state, count },
        }),
      );
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
      const res = await transport.request(
        "GET",
        buildUrl("/payment_methods/:payment_method_token.json", { path: { payment_method_token } }),
      );
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
      const res = await transport.request(
        "PUT",
        buildUrl("/payment_methods/:payment_method_token.json", { path: { payment_method_token } }),
        {
          body: { payment_method },
        },
      );
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
        buildUrl("/payment_methods/:payment_method_token/retain.json", {
          path: { payment_method_token },
        }),
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
        buildUrl("/payment_methods/:payment_method_token/recache.json", {
          path: { payment_method_token },
        }),
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
      const res = await transport.request(
        "GET",
        buildUrl("/payment_methods/:payment_method_token/transactions.json", {
          path: { payment_method_token },
          query: { since_token, order },
        }),
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
      const { payment_method_token, since_token, count, include_transactions } = params as {
        payment_method_token: string;
        since_token?: string;
        count?: string;
        include_transactions?: boolean;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/payment_methods/:payment_method_token/events.json", {
          path: { payment_method_token },
          query: { since_token, count, include_transactions },
        }),
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
        buildUrl("/payment_methods/:payment_method_token/metadata.json", {
          path: { payment_method_token },
        }),
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
        buildUrl("/payment_methods/:payment_method_token/update_gratis.json", {
          path: {
            payment_method_token,
          },
        }),
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
      const res = await transport.request(
        "GET",
        buildUrl("/payment_methods/events/:event_token.json", { path: { event_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_payment_method_list_all_events",
    description: TOOL_DESCRIPTIONS.spreedly_payment_method_list_all_events,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListAllPaymentMethodEventsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order, event_type, count, include_transactions } = params as {
        since_token?: string;
        order?: string;
        event_type?: string;
        count?: string;
        include_transactions?: boolean;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/payment_methods/events.json", {
          query: { since_token, order, event_type, count, include_transactions },
        }),
      );
      return res.data;
    },
  },
];
