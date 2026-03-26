import { z } from "zod";
import {
  CommonGatewayTransactionFields,
  CreditCardSchema,
  ApplePaySchema,
  GooglePaySchema,
  BankAccountSchema,
  RecoverParamsSchema,
} from "../commons/schemas";

export const ListTransactionsSchema = z
  .object({
    state: z
      .enum([
        "succeeded",
        "failed",
        "gateway_processing_failed",
        "gateway_processing_result_unknown",
      ])
      .optional()
      .describe("Filter transactions by state"),
    count: z.string().optional().describe("Number of transactions to return"),
    since_token: z.string().optional().describe("Pagination token"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
  })
  .strict();

export const ShowTransactionSchema = z
  .object({
    transaction_token: z.string().describe("The token of the transaction to retrieve"),
  })
  .strict();

export const UpdateTransactionSchema = z
  .object({
    transaction_token: z.string().describe("The token of the transaction to update"),
    metadata: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Metadata key-value pairs to update on the transaction"),
  })
  .strict();

export const CaptureTransactionSchema = z
  .object({
    transaction_token: z.string().describe("The token of the authorization to capture"),
    amount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe(
        "Amount in cents for a partial capture. Omit to capture the full authorized amount",
      ),
    currency_code: z
      .string()
      .optional()
      .describe("ISO 4217 currency code. Required if `amount` is provided for a partial capture"),
  })
  .strict();

export const VoidTransactionSchema = z
  .object({
    transaction_token: z.string().describe("The token of the transaction to void"),
  })
  .strict();

export const CreditTransactionSchema = z
  .object({
    transaction_token: z.string().describe("The token of the transaction to refund"),
    amount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Amount in cents for a partial refund. Omit to refund the full transaction amount"),
    currency_code: z.string().length(3).optional().describe("ISO 4217 currency code"),
  })
  .strict();

export const CompleteTransactionSchema = z
  .object({
    transaction_token: z.string().describe("The token of the transaction to complete"),
  })
  .strict();

export const ConfirmTransactionSchema = CommonGatewayTransactionFields.extend({
  transaction_token: z.string().describe("The token of the pending offsite transaction to confirm"),
  amount: z.number().int().positive().describe("Amount in cents to charge (e.g., 1000 = $10.00)"),
  currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),

  // All payment method pass-ins are valid on a reference purchase too
  payment_method_token: z
    .string()
    .optional()
    .describe("Token of an existing Spreedly vault payment method"),
  credit_card: CreditCardSchema.optional(),
  bank_account: BankAccountSchema.optional(),
  apple_pay: ApplePaySchema.optional(),
  google_pay: GooglePaySchema.optional(),
  sca_authentication_token: z
    .string()
    .optional()
    .describe("Token from a completed SCA / 3DS session"),

  // Purchase-specific optional fields
  browser_info: z
    .string()
    .optional()
    .describe(
      "Serialized browser info from Spreedly.ThreeDS.serialize; required for 3DS2 web flows",
    ),
  ignore_failed_authentication_result: z
    .boolean()
    .optional()
    .describe("Complete 3DS2 Global transaction even when authentication fails"),

  retry: RecoverParamsSchema.optional(),

  // Composer-only normalized fields
  workflow_key: z
    .string()
    .optional()
    .describe("Spreedly workflow key; Composer / /transactions resource only"),
  order_data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized order fields; Composer / /transactions resource only"),
  customer_data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized cardholder fields; Composer / /transactions resource only"),
  risk_data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized risk fields; Composer / /transactions resource only"),
  merchant_metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized merchant fields; Composer / /transactions resource only"),
}).strict();

export const TranscriptTransactionSchema = z
  .object({
    transaction_token: z.string().describe("The token of the transaction"),
  })
  .strict();

export const PurchaseReferenceSchema = CommonGatewayTransactionFields.extend({
  transaction_token: z
    .string()
    .describe("The token of the prior authorized transaction to reference for this purchase"),
  amount: z.number().int().positive().describe("Amount in cents to charge (e.g., 1000 = $10.00)"),
  currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),

  // All payment method pass-ins are valid on a reference purchase too
  payment_method_token: z
    .string()
    .optional()
    .describe("Token of an existing Spreedly vault payment method"),
  credit_card: CreditCardSchema.optional(),
  bank_account: BankAccountSchema.optional(),
  apple_pay: ApplePaySchema.optional(),
  google_pay: GooglePaySchema.optional(),
  sca_authentication_token: z
    .string()
    .optional()
    .describe("Token from a completed SCA / 3DS session"),

  // Purchase-specific optional fields
  browser_info: z
    .string()
    .optional()
    .describe(
      "Serialized browser info from Spreedly.ThreeDS.serialize; required for 3DS2 web flows",
    ),
  ignore_failed_authentication_result: z
    .boolean()
    .optional()
    .describe("Complete 3DS2 Global transaction even when authentication fails"),

  retry: RecoverParamsSchema.optional(),

  // Composer-only normalized fields
  workflow_key: z
    .string()
    .optional()
    .describe("Spreedly workflow key; Composer / /transactions resource only"),
  order_data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized order fields; Composer / /transactions resource only"),
  customer_data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized cardholder fields; Composer / /transactions resource only"),
  risk_data: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized risk fields; Composer / /transactions resource only"),
  merchant_metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Normalized merchant fields; Composer / /transactions resource only"),
}).strict();
