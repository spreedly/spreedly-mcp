import { z } from "zod";

export const ListTransactionsSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
  order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
}).strict();

export const ShowTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction to retrieve"),
}).strict();

export const UpdateTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction to update"),
  metadata: z.record(z.string(), z.unknown()).optional().describe("Metadata fields to update"),
}).strict();

export const CaptureTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the authorization to capture"),
  amount: z.number().int().positive().optional().describe("Amount in cents to capture (partial capture). Omit for full capture"),
  currency_code: z.string().length(3).optional().describe("ISO 4217 currency code"),
}).strict();

export const VoidTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction to void"),
}).strict();

export const CreditTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction to refund"),
  amount: z.number().int().positive().optional().describe("Amount in cents to refund (partial refund). Omit for full refund"),
  currency_code: z.string().length(3).optional().describe("ISO 4217 currency code"),
}).strict();

export const CompleteTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction to complete"),
}).strict();

export const ConfirmTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction to confirm"),
}).strict();

export const TranscriptTransactionSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction"),
}).strict();

export const AuthorizeWorkflowSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  amount: z.number().int().positive().describe("Amount in cents"),
  currency_code: z.string().length(3).describe("ISO 4217 currency code"),
  retain_on_success: z.boolean().optional().describe("Whether to retain the payment method on success"),
  order_id: z.string().optional().describe("Merchant order identifier"),
  description: z.string().optional().describe("Transaction description"),
}).strict();

export const PurchaseWorkflowSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  amount: z.number().int().positive().describe("Amount in cents"),
  currency_code: z.string().length(3).describe("ISO 4217 currency code"),
  retain_on_success: z.boolean().optional().describe("Whether to retain the payment method on success"),
  order_id: z.string().optional().describe("Merchant order identifier"),
  description: z.string().optional().describe("Transaction description"),
}).strict();

export const VerifyWorkflowSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  currency_code: z.string().length(3).describe("ISO 4217 currency code"),
  retain_on_success: z.boolean().optional().describe("Whether to retain the payment method on success"),
}).strict();

export const PurchaseReferenceSchema = z.object({
  transaction_token: z.string().describe("The token of the prior transaction to reference"),
  amount: z.number().int().positive().describe("Amount in cents"),
  currency_code: z.string().length(3).describe("ISO 4217 currency code"),
}).strict();
