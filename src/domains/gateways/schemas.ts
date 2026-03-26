import { z } from "zod";
import {
  CreditCardSchema,
  ApplePaySchema,
  GooglePaySchema,
  BankAccountSchema,
  CommonGatewayTransactionFields,
  ProtectionParametersSchema,
  ScaAuthenticationParametersSchema,
  RecoverParamsSchema,
} from "../commons/schemas";

export const CreateGatewaySchema = z
  .object({
    gateway_type: z
      .string()
      .describe("The gateway type identifier (e.g., `test`, `stripe`, `braintree`)."),
    credentials: z
      .record(z.string(), z.unknown())
      .optional()
      .describe(
        "Gateway-specific credential fields required by this gateway type (e.g., `login`, `password`). Refer to the gateway's documentation for the exact field names.",
      ),
    description: z
      .string()
      .optional()
      .describe("Human-readable description to differentiate multiple gateways of the same type."),
    merchant_profile_key: z
      .string()
      .optional()
      .describe(
        "Token of an existing Merchant Profile to associate with this gateway for merchant-data enrichment on transactions.",
      ),
    sub_merchant_key: z
      .string()
      .optional()
      .describe(
        "Token of an existing Sub-merchant to tag transactions routed through this gateway.",
      ),
    sandbox: z
      .boolean()
      .optional()
      .describe(
        "When `true`, provisions the gateway in sandbox/test mode. Use for integration testing against the gateway's test environment.",
      ),
  })
  .strict();

export const ListGatewaysSchema = z
  .object({
    since_token: z.string().optional().describe("Pagination token to fetch results after"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order by creation date"),
    count: z.string().optional().describe("Number of gateways to return"),
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
      .describe(
        "Updated gateway-specific credential fields. Pass only the fields that need changing.",
      ),
    description: z
      .string()
      .optional()
      .describe("Updated human-readable description for the gateway."),
    merchant_profile_key: z
      .string()
      .optional()
      .describe("Updated Merchant Profile token to associate with this gateway."),
    sub_merchant_key: z
      .string()
      .optional()
      .describe("Updated Sub-merchant token to associate with this gateway."),
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
    state: z
      .enum([
        "succeeded",
        "failed",
        "gateway_processing_failed",
        "gateway_processing_result_unknown",
      ])
      .optional()
      .describe("Transaction states to return"),
  })
  .strict();

const ScaAuthenticatedSchema = z
  .object({
    sca_authentication_token: z
      .string()
      .describe("Token from the SCA Authenticate endpoint after completing 3DS"),
    amount: z
      .number()
      .int()
      .positive()
      .describe("Authenticated amount in smallest currency unit, e.g. 1000 = $10.00"),
    currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),
  })
  .describe("References a completed SCA / 3DS authentication session (Authorize flow only)");

export const GatewayAuthorizeSchema = CommonGatewayTransactionFields.extend({
  gateway_token: z.string().describe("The token of the gateway to purchase at"),
  amount: z
    .number()
    .int()
    .positive()
    .describe("Amount in smallest currency unit, e.g. 1000 = $10.00"),
  currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),

  // Payment method — exactly one required
  payment_method_token: z
    .string()
    .optional()
    .describe("Token of an existing Spreedly vault payment method"),
  credit_card: CreditCardSchema.optional(),
  apple_pay: ApplePaySchema.optional(),
  google_pay: GooglePaySchema.optional(),
  sca_authenticated: ScaAuthenticatedSchema.optional().describe(
    "Completed SCA session; mutually exclusive with the other payment method fields",
  ),

  retry: RecoverParamsSchema.optional(),
})
  .refine(
    (data) =>
      Boolean(
        data.payment_method_token ||
        data.credit_card ||
        data.apple_pay ||
        data.google_pay ||
        data.sca_authenticated,
      ),
    {
      message:
        "One of payment_method_token, credit_card, apple_pay, google_pay, or sca_authenticated is required",
    },
  )
  .describe("Authorize transaction payload; amount and currency_code are required")
  .strict();

export const GatewayPurchaseSchema = CommonGatewayTransactionFields.extend({
  gateway_token: z.string().describe("The token of the gateway to purchase at"),
  amount: z
    .number()
    .int()
    .positive()
    .describe("Amount in smallest currency unit, e.g. 1000 = $10.00"),
  currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),

  // Payment method — exactly one required
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
})
  .refine(
    (data) =>
      Boolean(
        data.payment_method_token ||
        data.credit_card ||
        data.bank_account ||
        data.apple_pay ||
        data.google_pay ||
        data.sca_authentication_token,
      ),
    {
      message:
        "One of payment_method_token, credit_card, bank_account, apple_pay, google_pay, or sca_authentication_token is required",
    },
  )
  .describe("Purchase transaction payload; amount and currency_code are required")
  .describe("Purchase transaction payload")
  .strict();

export const GatewayVerifySchema = z
  .object({
    payment_method_token: z.string().describe("Token of the payment method to verify"),
    retain_on_success: z
      .boolean()
      .optional()
      .describe("Retain the payment method in the vault if verification succeeds"),
    currency_code: z
      .string()
      .optional()
      .describe("ISO 4217 currency code; required by some gateways"),
    ip: z.string().optional().describe("Customer IP; required by some gateways"),
    sub_merchant_key: z
      .string()
      .optional()
      .describe("Token of the sub-merchant to associate with this transaction"),
    sca_authentication_token: z
      .string()
      .optional()
      .describe("SCA authentication token from a completed 3DS session"),
    sca_provider_key: z
      .string()
      .optional()
      .describe("SCA Provider token; triggers 3DS2 Global auth before verification"),
    sca_authentication_parameters: ScaAuthenticationParametersSchema.optional(),
    gateway_specific_fields: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Gateway-specific options nested under the gateway type key"),
    attempt_network_token: z
      .boolean()
      .optional()
      .describe("true to verify using a network token if available"),
    provision_network_token: z
      .boolean()
      .optional()
      .describe("true to provision a network token during verification"),
    protection_provider_key: z
      .string()
      .optional()
      .describe("Protection Provider token; triggers a fraud check"),
    protection_parameters: ProtectionParametersSchema.optional(),
  })
  .describe("verify transaction payload")
  .strict();

export const GatewayStoreSchema = z
  .object({
    gateway_token: z.string().describe("The token of the gateway to store the payment method at"),
    payment_method_token: z
      .string()
      .describe("The token of the payment method to store at the gateway"),
    retain_on_success: z
      .boolean()
      .optional()
      .describe("When `true`, retains the payment method in the Spreedly vault if store succeeds"),
    ip: z.string().optional().describe("End-customer IP address"),
    order_id: z.string().optional().describe("Merchant-assigned order identifier"),
    gateway_specific_fields: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Gateway-specific optional fields nested under the gateway type name."),
  })
  .strict();

export const GatewayGeneralCreditSchema = z
  .object({
    payment_method_token: z.string().describe("Token of the payment method to credit"),
    amount: z
      .number()
      .int()
      .positive()
      .describe("Amount in smallest currency unit, e.g. 1000 = $10.00"),
    currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),
    order_id: z
      .string()
      .optional()
      .describe("Merchant order ID; defaults to the Spreedly transaction token"),
    description: z
      .string()
      .optional()
      .describe("Human-readable description forwarded to the gateway if supported"),
    ip: z.string().optional().describe("Customer IP address"),
    email: z
      .string()
      .email()
      .optional()
      .describe("Overrides the customer email on the payment method for this transaction"),
    sub_merchant_key: z
      .string()
      .optional()
      .describe("Token of the sub-merchant to associate with this transaction"),
    continue_on_failure: z
      .boolean()
      .optional()
      .describe("Keep the CVV cached briefly on failure instead of deleting immediately"),
  })
  .describe("General Credit transaction request")
  .strict();
