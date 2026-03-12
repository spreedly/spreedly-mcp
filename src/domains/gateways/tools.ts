import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
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
      const { since_token, order } = params as { since_token?: string; order?: string };
      const query = buildQuery({ since_token, order });
      const res = await transport.request("GET", `/gateways.json${query}`);
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
      const res = await transport.request("GET", `/gateways/${gateway_token}.json`);
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
      const res = await transport.request("PUT", `/gateways/${gateway_token}.json`, { body });
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
      const res = await transport.request("PUT", `/gateways/${gateway_token}/retain.json`);
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
      const { gateway_token, since_token, order } = params as {
        gateway_token: string;
        since_token?: string;
        order?: string;
      };
      const query = buildQuery({ since_token, order });
      const res = await transport.request(
        "GET",
        `/gateways/${gateway_token}/transactions.json${query}`,
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
      const res = await transport.request("POST", `/gateways/${gateway_token}/authorize.json`, {
        body,
      });
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
      const res = await transport.request("POST", `/gateways/${gateway_token}/purchase.json`, {
        body,
      });
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
      const res = await transport.request("POST", `/gateways/${gateway_token}/verify.json`, {
        body,
      });
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
      const res = await transport.request("POST", `/gateways/${gateway_token}/store.json`, {
        body,
      });
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
        `/gateways/${gateway_token}/general_credit.json`,
        { body },
      );
      return res.data;
    },
  },
];

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}
