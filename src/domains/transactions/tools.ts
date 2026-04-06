import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
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
} from "./schemas.js";

export const transactionTools: ToolDefinition[] = [
  {
    name: "spreedly_transaction_list",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListTransactionsSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order, state, count } = params as {
        since_token?: string;
        order?: string;
        state?: string;
        count?: string;
      };
      const res = await transport.request(
        "GET",
        buildUrl("/transactions.json", { query: { since_token, order, state, count } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_show",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_show,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ShowTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/transactions/:transaction_token.json", { path: { transaction_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_update",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_update,
    // Destructive: PATCH can overwrite existing metadata keys, not a pure append
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdateTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, metadata } = params as {
        transaction_token: string;
        metadata?: Record<string, unknown>;
      };
      const body = { transaction: { metadata } };
      const res = await transport.request(
        "PATCH",
        buildUrl("/transactions/:transaction_token.json", { path: { transaction_token } }),
        {
          body,
        },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_capture",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_capture,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: CaptureTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, amount, currency_code } = params as {
        transaction_token: string;
        amount?: number;
        currency_code?: string;
      };
      const txnBody: Record<string, unknown> = {};
      if (amount !== undefined) txnBody.amount = amount;
      if (currency_code !== undefined) txnBody.currency_code = currency_code;
      const body = { transaction: txnBody };
      const res = await transport.request(
        "POST",
        buildUrl("/transactions/:transaction_token/capture.json", { path: { transaction_token } }),
        { body },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_void",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_void,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: VoidTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request(
        "POST",
        buildUrl("/transactions/:transaction_token/void.json", { path: { transaction_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_credit",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_credit,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: CreditTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token, amount, currency_code } = params as {
        transaction_token: string;
        amount?: number;
        currency_code?: string;
      };
      const txnBody: Record<string, unknown> = {};
      if (amount !== undefined) txnBody.amount = amount;
      if (currency_code !== undefined) txnBody.currency_code = currency_code;
      const body = { transaction: txnBody };
      const res = await transport.request(
        "POST",
        buildUrl("/transactions/:transaction_token/credit.json", { path: { transaction_token } }),
        { body },
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_complete",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_complete,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: CompleteTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request(
        "POST",
        buildUrl("/transactions/:transaction_token/complete.json", { path: { transaction_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_confirm",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_confirm,
    annotations: { destructiveHint: true, idempotentHint: false, openWorldHint: true },
    schema: ConfirmTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request(
        "POST",
        buildUrl("/transactions/:transaction_token/confirm.json", { path: { transaction_token } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_transaction_transcript",
    description: TOOL_DESCRIPTIONS.spreedly_transaction_transcript,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: TranscriptTransactionSchema.shape,
    handler: async (params, { transport }) => {
      const { transaction_token } = params as { transaction_token: string };
      const res = await transport.request(
        "GET",
        buildUrl("/transactions/:transaction_token/transcript", { path: { transaction_token } }),
      );
      return res.data;
    },
  },
];
