import { z } from "zod";

export const CreateGatewaySchema = z
  .object({
    gateway_type: z
      .string()
      .describe("The type of gateway to create (e.g., 'test', 'stripe', 'braintree')"),
    credentials: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Gateway-specific credential fields"),
  })
  .strict();

export const ListGatewaysSchema = z
  .object({
    since_token: z.string().optional().describe("Pagination token to fetch results after"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order by creation date"),
  })
  .strict();

export const ShowGatewaySchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway to retrieve"),
  })
  .strict();

export const UpdateGatewaySchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway to update"),
    credentials: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Updated gateway credentials"),
  })
  .strict();

export const RedactGatewaySchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway to redact"),
  })
  .strict();

export const RetainGatewaySchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway to retain"),
  })
  .strict();

export const ListGatewayTransactionsSchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway"),
    since_token: z.string().optional().describe("Pagination token"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
  })
  .strict();

export const GatewayAuthorizeSchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway to authorize against"),
    payment_method_token: z.string().describe("The token of the payment method to authorize"),
    amount: z.number().int().positive().describe("Amount in cents to authorize"),
    currency_code: z.string().length(3).describe("ISO 4217 currency code (e.g., 'USD')"),
    retain_on_success: z
      .boolean()
      .optional()
      .describe("Whether to retain the payment method on success"),
    order_id: z.string().optional().describe("Merchant order identifier"),
    description: z.string().optional().describe("Transaction description"),
    ip: z.string().optional().describe("Customer IP address"),
    email: z.string().optional().describe("Customer email"),
  })
  .strict();

export const GatewayPurchaseSchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway"),
    payment_method_token: z.string().describe("The token of the payment method"),
    amount: z.number().int().positive().describe("Amount in cents"),
    currency_code: z.string().length(3).describe("ISO 4217 currency code"),
    retain_on_success: z
      .boolean()
      .optional()
      .describe("Whether to retain the payment method on success"),
    order_id: z.string().optional().describe("Merchant order identifier"),
    description: z.string().optional().describe("Transaction description"),
    ip: z.string().optional().describe("Customer IP address"),
    email: z.string().optional().describe("Customer email"),
  })
  .strict();

export const GatewayVerifySchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway"),
    payment_method_token: z.string().describe("The token of the payment method"),
    currency_code: z.string().length(3).describe("ISO 4217 currency code"),
    retain_on_success: z
      .boolean()
      .optional()
      .describe("Whether to retain the payment method on success"),
  })
  .strict();

export const GatewayStoreSchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway"),
    payment_method_token: z.string().describe("The token of the payment method"),
  })
  .strict();

export const GatewayGeneralCreditSchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway"),
    payment_method_token: z.string().describe("The token of the payment method to credit"),
    amount: z.number().int().positive().describe("Amount in cents to credit"),
    currency_code: z.string().length(3).describe("ISO 4217 currency code"),
  })
  .strict();
