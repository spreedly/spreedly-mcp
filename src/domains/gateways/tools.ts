import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateGatewaySchema,
  ListGatewaysSchema,
  ShowGatewaySchema,
  UpdateGatewaySchema,
  RetainGatewaySchema,
  ListGatewayTransactionsSchema,
  GatewayAuthorizeSchema,
  GatewayPurchaseSchema,
  GatewayVerifySchema,
  GatewayStoreSchema,
  GatewayGeneralCreditSchema,
} from "./schemas.js";

export const gatewayTools: ToolDefinition[] = [
  {
    name: "spreedly_gateway_create",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_create,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreateGatewaySchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_type, credentials } = params as {
        gateway_type: string;
        credentials?: Record<string, unknown>;
      };
      const body = { gateway: { gateway_type, ...credentials } };
      const res = await transport.request("POST", "/gateways.json", { body });
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_list",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListGatewaysSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order, count } = params as {
        since_token?: string;
        order?: string;
        count?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/gateways.json", { query: { since_token, order, count } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_show",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_show,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowGatewaySchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token } = params as { gateway_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/gateways/:gateway_token.json", { path: { gateway_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_update",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_update,
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdateGatewaySchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token, credentials } = params as {
        gateway_token: string;
        credentials?: Record<string, unknown>;
      };
      const body = { gateway: { ...credentials } };
      const res = await transport.request(
        "PUT",
        buildUrl("/gateways/:gateway_token.json", { path: { gateway_token } }),
        { body },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_retain",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_retain,
    // Only sets a flag (not destructive); re-retaining is a no-op (idempotent)
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
    schema: RetainGatewaySchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token } = params as { gateway_token: string };
      const res = await transport.request(
        "PUT",
        buildUrl("/gateways/:gateway_token/retain.json", { path: { gateway_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_list_supported",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_list_supported,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: {},
    handler: async (_params, { transport }) => {
      const res = await transport.request("GET", "/gateways_options.json");
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_list_transactions",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_list_transactions,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListGatewayTransactionsSchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token, since_token, order, state } = params as {
        gateway_token: string;
        since_token?: string;
        order?: string;
        state?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/gateways/:gateway_token/transactions.json", {
          path: { gateway_token },
          query: { since_token, order, state },
        }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_authorize",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_authorize,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: GatewayAuthorizeSchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token, ...txnParams } = params as Record<string, unknown> & {
        gateway_token: string;
      };
      const body = { transaction: txnParams };
      const res = await transport.request(
        "POST",
        buildUrl("/gateways/:gateway_token/authorize.json", { path: { gateway_token } }),
        {
          body,
        },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_purchase",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_purchase,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: GatewayPurchaseSchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token, ...txnParams } = params as Record<string, unknown> & {
        gateway_token: string;
      };
      const body = { transaction: txnParams };
      const res = await transport.request(
        "POST",
        buildUrl("/gateways/:gateway_token/purchase.json", { path: { gateway_token } }),
        {
          body,
        },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_verify",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_verify,
    // Not idempotent: each call creates a new Spreedly transaction record despite the zero-dollar auth
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
    schema: GatewayVerifySchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token, ...txnParams } = params as Record<string, unknown> & {
        gateway_token: string;
      };
      const body = { transaction: txnParams };
      const res = await transport.request(
        "POST",
        buildUrl("/gateways/:gateway_token/verify.json", { path: { gateway_token } }),
        {
          body,
        },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_store",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_store,
    // Not idempotent: each call creates a new transaction and may duplicate the vault entry at the gateway
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: true },
    schema: GatewayStoreSchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token, payment_method_token } = params as {
        gateway_token: string;
        payment_method_token: string;
      };
      const body = { transaction: { payment_method_token } };
      const res = await transport.request(
        "POST",
        buildUrl("/gateways/:gateway_token/store.json", { path: { gateway_token } }),
        {
          body,
        },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_gateway_general_credit",
    description: TOOL_DESCRIPTIONS.spreedly_gateway_general_credit,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: GatewayGeneralCreditSchema.shape,
    handler: async (params, { transport }) => {
      const { gateway_token, ...txnParams } = params as Record<string, unknown> & {
        gateway_token: string;
      };
      const body = { transaction: txnParams };
      const res = await transport.request(
        "POST",
        buildUrl("/gateways/:gateway_token/general_credit.json", { path: { gateway_token } }),
        { body },
      );
      return res.data;
    },
  },
];
