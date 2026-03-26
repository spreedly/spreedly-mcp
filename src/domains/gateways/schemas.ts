import { z } from "zod";
import { ShippingAddressSchema,BillingAddressSchema } from "../commons/schemas";
import { CreditCardSchema,ApplePaySchema, GooglePaySchema, BankAccountSchema } from "../commons/schemas";

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
      .describe(
        "Human-readable description to differentiate multiple gateways of the same type.",
      ),
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
    sca_authentication_token: z.string().describe("Token from the SCA Authenticate endpoint after completing 3DS"),
    amount:        z.number().int().positive().describe("Authenticated amount in smallest currency unit, e.g. 1000 = $10.00"),
    currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),
  })
  .describe("References a completed SCA / 3DS authentication session (Authorize flow only)");

const ScaAuthenticationParametersSchema = z
  .object({
    three_ds_requestor_challenge_ind: z.string().optional().describe("Whether a 3DS2 challenge is being requested"),
    test_scenario: z.boolean().optional().describe("true for a test scenario"),
    exemption_type: z
      .array(z.enum(["low_value_exemption", "transaction_risk_analysis_exemption"]))
      .optional()
      .describe("Exemption types to request; reduces likelihood of a challenge"),
    acquiring_bank_fraud_rate: z
      .string()
      .optional()
      .describe("Bank fraud rate threshold; required when requesting transaction_risk_analysis_exemption"),
  })
  .describe("Additional parameters for the Spreedly 3DS2 Global authentication flow");

const RecoverParamsSchema = z
  .object({
    gateway_tokens: z.array(z.string()).min(1).describe("Ordered list of fallback gateway tokens to retry against"),
    mode: z
      .enum(["standard", "outage_only"])
      .optional()
      .describe("'standard' retries on any failure; 'outage_only' retries only on gateway outages"),
    custom_errors: z
      .object({
        error_codes:               z.array(z.string()).optional().describe("Error codes that trigger a retry"),
        messages:                  z.array(z.string()).optional().describe("Error messages that trigger a retry"),
        additional_data:           z.array(z.string()).optional().describe("Additional values that trigger a retry"),
        override_default_error_codes: z.boolean().optional().describe("true to replace Spreedly defaults; false to extend them"),
      })
      .optional()
      .describe("Custom error conditions that trigger a Recover retry"),
  })
  .describe("Spreedly Recover config; retries a failed transaction against fallback gateways");

const CartItemSchema = z
  .object({
    name:     z.string().max(500).describe("Item name, max 500 chars"),
    quantity: z.number().positive().describe("Quantity purchased"),
    type:     z.enum(["TANGIBLE", "NON_TANGIBLE"]).default("TANGIBLE").describe("'TANGIBLE' for physical goods; 'NON_TANGIBLE' for digital / services"),
    price:    z.string().describe("Final line-item price after discounts, as a string"),
  })
  .describe("Single cart line item for fraud protection checks");

const ProtectionParametersSchema = z
  .object({
    // Required
    delivery_method: z.string().max(50).describe("Delivery method, e.g. 'FedEx', 'email'"),
    delivery_type:   z.enum(["PHYSICAL", "DIGITAL"]).default("PHYSICAL").describe("'PHYSICAL' for shipped goods; 'DIGITAL' for non-shipped"),
    cart_items:      z.array(CartItemSchema).min(1).describe("All items being purchased"),

    // Test-only
    test_scenario: z
      .object({
        scenario: z
          .enum([
            "protect_approved",
            "protect_sca_recommended_challenge",
            "protect_sca_recommended_authenticated",
            "protect_sca_recommended_not_authenticated",
            "protect_declined",
          ])
          .default("protect_approved")
          .describe("Protect test scenario to simulate"),
      })
      .optional()
      .describe("Test-only: simulates a specific Protect outcome"),

    // Fraud tokens
    fraud_token:       z.string().optional().describe("Forter fraud token from the Spreedly iFrame; web transactions only"),
    forter_mobile_uid: z.string().optional().describe("Device UID (IMEI / IDFV); mobile transactions only"),
    user_agent:        z.string().optional().describe("Customer browser User-Agent"),

    // Customer account
    customer_account_id:   z.string().optional().describe("Customer UID in merchant system; omit for guests"),
    customer_account_type: z
      .enum([
        "GUEST", "PRIVATE", "BUSINESS", "VIP", "MERCHANT_OPERATED", "TRIAL",
        "MERCHANT_EMPLOYEE", "PREMIUM_PAID", "SMALL_BUSINESS", "AGENT",
        "BUSINESS_PRIVATE", "BUSINESS_PREMIUM_PAID",
      ])
      .default("BUSINESS")
      .optional()
      .describe("Customer account classification"),
    customer_account_creation_date: z.number().optional().describe("Account creation date as Unix epoch seconds (UTC)"),

    // Billing identity — falls back to payment method when available
    billing_name:         z.string().optional().describe("Full billing name; falls back to payment method"),
    billing_first_name:   z.string().optional().describe("Billing first name; falls back to payment method"),
    billing_last_name:    z.string().optional().describe("Billing last name; falls back to payment method"),
    email:                z.string().email().optional().describe("Customer email; falls back to payment method"),
    billing_country:      z.string().optional().describe("Billing country; falls back to payment method"),
    billing_address1:     z.string().optional().describe("Billing address line 1; falls back to payment method"),
    billing_address2:     z.string().optional().describe("Billing address line 2; falls back to payment method"),
    billing_city:         z.string().optional().describe("Billing city; falls back to payment method"),
    billing_zip:          z.string().optional().describe("Billing ZIP; falls back to payment method"),
    billing_state:        z.string().optional().describe("Billing state; falls back to payment method"),
    billing_phone_number: z.string().optional().describe("Billing phone; falls back to payment method"),

    // Shipping identity — falls back to payment method when available
    shipping_name:         z.string().optional().describe("Full shipping name; falls back to payment method"),
    shipping_first_name:   z.string().optional().describe("Shipping first name; falls back to payment method"),
    shipping_last_name:    z.string().optional().describe("Shipping last name; falls back to payment method"),
    shipping_email:        z.string().email().optional().describe("Shipping email; falls back to payment method"),
    shipping_country:      z.string().optional().describe("Shipping country; falls back to payment method"),
    shipping_address1:     z.string().optional().describe("Shipping address line 1; falls back to payment method"),
    shipping_address2:     z.string().optional().describe("Shipping address line 2; falls back to payment method"),
    shipping_city:         z.string().optional().describe("Shipping city; falls back to payment method"),
    shipping_zip:          z.string().optional().describe("Shipping ZIP; falls back to payment method"),
    shipping_state:        z.string().optional().describe("Shipping state; falls back to payment method"),
    shipping_phone_number: z.string().optional().describe("Shipping phone; falls back to payment method"),
  })
  .describe(
    "Fraud protection parameters forwarded to the configured Protection Provider; " +
    "delivery_method, delivery_type, and cart_items are required"
  );

const CommonGatewayTransactionFields = z.object({
  order_id:    z.string().optional().describe("Merchant order ID; defaults to the Spreedly transaction token"),
  description: z.string().optional().describe("Human-readable description forwarded to the gateway if supported"),
  ip:          z.string().optional().describe("Customer IP; defaults to '127.0.0.1'; set to 'omit' to send null"),
  email:       z.string().email().optional().describe("Overrides the customer email on the payment method for this transaction"),
  retain_on_success:       z.boolean().optional().describe("Retain the payment method in the vault on success"),
  gateway_specific_fields: z.record(z.string(), z.unknown()).optional().describe("Gateway-specific options nested under the gateway type key"),
  sub_merchant_key:        z.string().optional().describe("Token of the sub-merchant to associate with this transaction"),
  sca_provider_key:        z.string().optional().describe("SCA Provider token; triggers 3DS2 Global auth before the gateway call"),
  sca_authentication_parameters: ScaAuthenticationParametersSchema.optional(),
  callback_url:    z.string().url().optional().describe("URL for async 3DS / offsite result delivery"),
  callback_format: z.enum(["json", "xml"]).optional().describe("Format for callback delivery; defaults to 'xml'"),
  shipping_address: ShippingAddressSchema.optional(),
  billing_address:  BillingAddressSchema.optional(),
  stored_credential_initiator:   z.enum(["merchant", "cardholder"]).optional().describe("Who is initiating this stored credential transaction"),
  stored_credential_reason_type: z.enum(["recurring", "unscheduled", "installment"]).optional().describe("Reason the stored payment method is being charged"),
  attempt_network_token:   z.boolean().optional().describe("true to transact with a network token (DPAN) if available"),
  provision_network_token: z.boolean().optional().describe("true to provision a network token during this transaction"),
  protection_provider_key: z.string().optional().describe("Protection Provider token; triggers a fraud check"),
  protection_parameters:   ProtectionParametersSchema.optional(),
  transaction_metadata:    z.record(z.string(), z.unknown()).optional().describe("Key-value pairs for Smart Routing; keys ≤ 50 chars, values ≤ 500 chars"),
  allow_blank_name:   z.boolean().optional().describe("Skip cardholder name validation for pass-in credit card transactions"),
  allow_expired_date: z.boolean().optional().describe("Skip expired date validation for pass-in credit card transactions"),
  allow_blank_date:   z.boolean().optional().describe("Skip expiration date presence validation for pass-in credit card transactions"),
});


export const GatewayAuthorizeSchema = CommonGatewayTransactionFields.extend({
      gateway_token: z.string().describe("The token of the gateway to purchase at"),
      amount:        z.number().int().positive().describe("Amount in smallest currency unit, e.g. 1000 = $10.00"),
      currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),

      // Payment method — exactly one required
      payment_method_token: z.string().optional().describe("Token of an existing Spreedly vault payment method"),
      credit_card:          CreditCardSchema.optional(),
      apple_pay:            ApplePaySchema.optional(),
      google_pay:           GooglePaySchema.optional(),
      sca_authenticated:    ScaAuthenticatedSchema.optional().describe(
        "Completed SCA session; mutually exclusive with the other payment method fields"
      ),

      retry: RecoverParamsSchema.optional(),
    })
    .refine(
      (data) => Boolean(
        data.payment_method_token || data.credit_card || data.apple_pay ||
        data.google_pay || data.sca_authenticated
      ),
      { message: "One of payment_method_token, credit_card, apple_pay, google_pay, or sca_authenticated is required" }
    )
    .describe("Authorize transaction payload; amount and currency_code are required")
    .strict()


export const GatewayPurchaseSchema = CommonGatewayTransactionFields
  .extend({
    gateway_token: z.string().describe("The token of the gateway to purchase at"),
    amount:        z.number().int().positive().describe("Amount in smallest currency unit, e.g. 1000 = $10.00"),
    currency_code: z.string().describe("ISO 4217 currency code, e.g. 'USD'"),

    // Payment method — exactly one required
    payment_method_token:     z.string().optional().describe("Token of an existing Spreedly vault payment method"),
    credit_card:              CreditCardSchema.optional(),
    bank_account:             BankAccountSchema.optional(),
    apple_pay:                ApplePaySchema.optional(),
    google_pay:               GooglePaySchema.optional(),
    sca_authentication_token: z.string().optional().describe("Token from a completed SCA / 3DS session"),

    // Purchase-specific optional fields
    browser_info: z.string().optional().describe("Serialized browser info from Spreedly.ThreeDS.serialize; required for 3DS2 web flows"),
    ignore_failed_authentication_result: z
      .boolean()
      .optional()
      .describe("Complete 3DS2 Global transaction even when authentication fails"),
    merchant_name_descriptor:     z.string().optional().describe("Human-readable merchant name forwarded to the gateway"),
    merchant_location_descriptor: z.string().optional().describe("Human-readable merchant location forwarded to the gateway"),
    retry: RecoverParamsSchema.optional(),
    })
    .refine(
      (data) => Boolean(
        data.payment_method_token || data.credit_card || data.bank_account ||
        data.apple_pay || data.google_pay || data.sca_authentication_token
      ),
      {
        message:
          "One of payment_method_token, credit_card, bank_account, apple_pay, google_pay, or sca_authentication_token is required",
      }
    )
    .describe("Purchase transaction payload; amount and currency_code are required")
  .describe("Purchase transaction payload")
  .strict();

export const GatewayVerifySchema = z
  .object({
    payment_method_token:          z.string().describe("Token of the payment method to verify"),
    retain_on_success:             z.boolean().optional().describe("Retain the payment method in the vault if verification succeeds"),
    currency_code:                 z.string().optional().describe("ISO 4217 currency code; required by some gateways"),
    ip:                            z.string().optional().describe("Customer IP; required by some gateways"),
    sub_merchant_key:              z.string().optional().describe("Token of the sub-merchant to associate with this transaction"),
    sca_authentication_token:      z.string().optional().describe("SCA authentication token from a completed 3DS session"),
    sca_provider_key:              z.string().optional().describe("SCA Provider token; triggers 3DS2 Global auth before verification"),
    sca_authentication_parameters: ScaAuthenticationParametersSchema.optional(),
    gateway_specific_fields:       z.record(z.string(), z.unknown()).optional().describe("Gateway-specific options nested under the gateway type key"),
    attempt_network_token:         z.boolean().optional().describe("true to verify using a network token if available"),
    provision_network_token:       z.boolean().optional().describe("true to provision a network token during verification"),
    protection_provider_key:       z.string().optional().describe("Protection Provider token; triggers a fraud check"),
    protection_parameters:         ProtectionParametersSchema.optional(),
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
    amount:               z.number().int().positive().describe("Amount in smallest currency unit, e.g. 1000 = $10.00"),
    currency_code:        z.string().describe("ISO 4217 currency code, e.g. 'USD'"),
    order_id:             z.string().optional().describe("Merchant order ID; defaults to the Spreedly transaction token"),
    description:          z.string().optional().describe("Human-readable description forwarded to the gateway if supported"),
    ip:                   z.string().optional().describe("Customer IP address"),
    email:                z.string().email().optional().describe("Overrides the customer email on the payment method for this transaction"),
    sub_merchant_key:     z.string().optional().describe("Token of the sub-merchant to associate with this transaction"),
    continue_on_failure:  z.boolean().optional().describe("Keep the CVV cached briefly on failure instead of deleting immediately"),
  })
  .describe("General Credit transaction request")
  .strict();