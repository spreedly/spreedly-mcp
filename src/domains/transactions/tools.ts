import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  ListTransactionsSchema,
  ShowTransactionSchema,
  UpdateTransactionSchema,
  CaptureTransactionSchema,
  VoidTransactionSchema,
  CreditTransactionSchema,
  CompleteTransactionSchema,
  ConfirmTransactionSchema,
  TranscriptTransactionSchema,
  AuthorizeWorkflowSchema,
  PurchaseWorkflowSchema,
  VerifyWorkflowSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const transactionTools: ToolDefinition[] = [
  {
    name: "spreedly_transaction_list",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_list,
    schema: ListTransactionsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order } = params as { since_token?: string; order?: string };
      const query = buildQuery({ since_token, order });
      const res = await transport.request("GET", `/transactions.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_show",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_show,
    schema: ShowTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request("GET", `/transactions/${transaction_token}.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_update",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_update,
    schema: UpdateTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, metadata } = params as { transaction_token: string; metadata?: Record<string, unknown> };
      const body = { transaction: { metadata } };
      const res = await transport.request("PATCH", `/transactions/${transaction_token}.json`, { body });
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_capture",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_capture,
    schema: CaptureTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, amount, currency_code } = params as { transaction_token: string; amount?: number; currency_code?: string };
      const txnBody: Record<string, unknown> = {};
      if (amount !== undefined) txnBody.amount = amount;
      if (currency_code !== undefined) txnBody.currency_code = currency_code;
      const body = { transaction: txnBody };
      const res = await transport.request("POST", `/transactions/${transaction_token}/capture.json`, { body });
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_void",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_void,
    schema: VoidTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request("POST", `/transactions/${transaction_token}/void.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_credit",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_credit,
    schema: CreditTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, amount, currency_code } = params as { transaction_token: string; amount?: number; currency_code?: string };
      const txnBody: Record<string, unknown> = {};
      if (amount !== undefined) txnBody.amount = amount;
      if (currency_code !== undefined) txnBody.currency_code = currency_code;
      const body = { transaction: txnBody };
      const res = await transport.request("POST", `/transactions/${transaction_token}/credit.json`, { body });
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_complete",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_complete,
    schema: CompleteTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request("POST", `/transactions/${transaction_token}/complete.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_confirm",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_confirm,
    schema: ConfirmTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request("POST", `/transactions/${transaction_token}/confirm.json`);
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_transcript",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_transcript,
    schema: TranscriptTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request("GET", `/transactions/${transaction_token}/transcript`);
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_authorize_workflow",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_authorize_workflow,
    schema: AuthorizeWorkflowSchema.shape,
    handler: async (params, { transport }) => {
      const body = { transaction: params };
      const res = await transport.request("POST", "/transactions/authorize.json", { body });
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_purchase_workflow",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_purchase_workflow,
    schema: PurchaseWorkflowSchema.shape,
    handler: async (params, { transport }) => {
      const body = { transaction: params };
      const res = await transport.request("POST", "/transactions/purchase.json", { body });
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_verify_workflow",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_verify_workflow,
    schema: VerifyWorkflowSchema.shape,
    handler: async (params, { transport }) => {
      const body = { transaction: params };
      const res = await transport.request("POST", "/transactions/verify.json", { body });
      return res.data;
    },
  },
];
