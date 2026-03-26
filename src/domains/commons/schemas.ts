import { z } from "zod";

export const ShippingAddressSchema = z
  .object({
    name: z.string().optional().describe("Customer full name for shipping"),
    address1: z.string().optional().describe("Shipping address line 1"),
    address2: z.string().optional().describe("Shipping address line 2"),
    city: z.string().optional().describe("Shipping city"),
    state: z.string().optional().describe("Shipping state or province"),
    zip: z.string().optional().describe("Shipping zip or postal code"),
    country: z.string().optional().describe("Shipping country code"),
    phone_number: z.string().optional().describe("Shipping phone number"),
  })
  .describe("Shipping address for this transaction");

export const BillingAddressSchema = z
  .object({
    name: z.string().optional().describe("Customer full name for billing"),
    address1: z.string().optional().describe("Billing address line 1"),
    address2: z.string().optional().describe("Billing address line 2"),
    city: z.string().optional().describe("Billing city"),
    state: z.string().optional().describe("Billing state or province"),
    zip: z.string().optional().describe("Billing zip or postal code"),
    country: z.string().optional().describe("Billing country code"),
    phone_number: z.string().optional().describe("Billing phone number"),
  })
  .describe("Billing address for this transaction");

// ---------------------------------------------------------------------------
// Used by: AuthorizeRequest, PurchaseRequest, ConfirmTransactionRequest,
//          CreatePaymentMethodRequest
// ---------------------------------------------------------------------------
export const CreditCardSchema = z
  .object({
    number: z.string().min(12).max(19).describe("Full PAN; tokenized by Spreedly"),
    month: z
      .string()
      .regex(/^(0?[1-9]|1[0-2])$/)
      .describe("Expiration month, e.g. '12'"),
    year: z
      .string()
      .regex(/^\d{4}$/)
      .describe("4-digit expiration year, e.g. '2030'"),
    first_name: z
      .string()
      .optional()
      .describe("Cardholder first name; required if full_name is omitted"),
    last_name: z
      .string()
      .optional()
      .describe("Cardholder last name; required if full_name is omitted"),
    full_name: z
      .string()
      .optional()
      .describe("Full name; parsed into first_name / last_name by Spreedly"),
    verification_value: z.string().min(3).max(4).optional().describe("CVV / CVC code"),
    company: z.string().optional().describe("Company on the card"),
    address1: z.string().optional().describe("Billing address line 1"),
    address2: z.string().optional().describe("Billing address line 2"),
    city: z.string().optional().describe("Billing city"),
    state: z.string().optional().describe("Billing state"),
    zip: z.string().optional().describe("Billing ZIP code"),
    country: z.string().optional().describe("Billing country code"),
    phone_number: z.string().optional().describe("Billing phone number"),
    shipping_address1: z.string().optional().describe("Shipping address line 1"),
    shipping_address2: z.string().optional().describe("Shipping address line 2"),
    shipping_city: z.string().optional().describe("Shipping city"),
    shipping_state: z.string().optional().describe("Shipping state"),
    shipping_zip: z.string().optional().describe("Shipping ZIP code"),
    shipping_country: z.string().optional().describe("Shipping country code"),
    shipping_phone_number: z.string().optional().describe("Shipping phone number"),
  })
  .refine((data) => Boolean(data.first_name && data.last_name) || Boolean(data.full_name), {
    message: "Provide either first_name + last_name or full_name",
  })
  .describe("Credit card details");

// ---------------------------------------------------------------------------
// Used by: PurchaseRequest, CreatePaymentMethodRequest
// ---------------------------------------------------------------------------
export const BankAccountSchema = z
  .object({
    bank_account_number: z.string().min(1).describe("Bank account number"),
    bank_routing_number: z
      .string()
      .length(9)
      .regex(/^\d{9}$/)
      .describe("9-digit ABA routing number"),
    first_name: z
      .string()
      .optional()
      .describe("Account owner first name; required if full_name is omitted"),
    last_name: z
      .string()
      .optional()
      .describe("Account owner last name; required if full_name is omitted"),
    full_name: z.string().optional().describe("Full name; parsed into first_name / last_name"),
    bank_account_type: z.enum(["checking", "savings"]).optional().describe("Account type"),
    bank_account_holder_type: z
      .enum(["business", "personal"])
      .optional()
      .describe("Account holder type"),
  })
  .refine((data) => Boolean(data.first_name && data.last_name) || Boolean(data.full_name), {
    message: "Provide either first_name + last_name or full_name",
  })
  .describe("Bank account details");

// ---------------------------------------------------------------------------
// Used by: AuthorizeRequest, PurchaseRequest, CreatePaymentMethodRequest
// ---------------------------------------------------------------------------

const ApplePayPaymentDataSchema = z
  .object({
    version: z.any().optional().describe("Version information about the payment token"),
    data: z.any().optional().describe("Encrypted payment data"),
    signature: z.any().optional().describe("Signature of the payment and header data"),
    header: z
      .object({
        ephemeralPublicKey: z
          .any()
          .optional()
          .describe("Ephemeral public key generated for the transaction"),
        transactionId: z
          .any()
          .optional()
          .describe("Unique identifier for the Apple Pay transaction"),
        publicKeyHash: z.any().optional().describe("Hash of the merchant's public key"),
      })
      .describe("Additional version-dependent information used to decrypt and verify the payment")
      .optional(),
  })
  .describe("The JSON serialized paymentData property of an Apple Pay PKPaymentToken");

export const ApplePaySchema = z
  .object({
    payment_data: ApplePayPaymentDataSchema,
    test_card_number: z
      .string()
      .optional()
      .describe(
        "To mark this as a test Apple Pay payment method, specify a test card number in this field.",
      ),
  })
  .describe(
    "Apple Pay payment method containing the decrypted PKPaymentToken from Apple's PassKit framework",
  );

// ---------------------------------------------------------------------------
// Used by: AuthorizeRequest, PurchaseRequest, CreatePaymentMethodRequest
// ---------------------------------------------------------------------------

const GooglePayPaymentDataSchema = z
  .object({
    signature: z
      .string()
      .optional()
      .describe("Verifies the message came from Google. Base64-encoded, created using ECDSA"),
    protocolVersion: z
      .string()
      .optional()
      .describe("Identifies the encryption/signing scheme under which the message was created"),
    signedMessage: z
      .string()
      .optional()
      .describe(
        "A serialized JSON string containing the encryptedMessage, ephemeralPublicKey and tag",
      ),
  })
  .describe("The JSON serialized Google Pay paymentData");

export const GooglePaySchema = z
  .object({
    payment_data: GooglePayPaymentDataSchema,
    test_card_number: z
      .string()
      .optional()
      .describe(
        "A test card number to mark this as a test payment method without using it against a production gateway",
      ),
    first_name: z.string().optional().describe("The first name of the cardholder"),
    last_name: z.string().optional().describe("The last name of the cardholder"),
    address_1: z.string().optional().describe("Cardholder's address line 1"),
    address_2: z.string().optional().describe("Cardholder's address line 2"),
    city: z.string().optional().describe("Cardholder's city"),
    state: z.string().optional().describe("Cardholder's state"),
    zip: z.string().optional().describe("Cardholder's zip code"),
    country: z.string().optional().describe("Cardholder's country code"),
  })
  .describe(
    "Google Pay payment method containing the encrypted payment token from Google's Pay API",
  );

export const ScaAuthenticationParametersSchema = z
  .object({
    three_ds_requestor_challenge_ind: z
      .string()
      .optional()
      .describe("Whether a 3DS2 challenge is being requested"),
    test_scenario: z.boolean().optional().describe("true for a test scenario"),
    exemption_type: z
      .array(z.enum(["low_value_exemption", "transaction_risk_analysis_exemption"]))
      .optional()
      .describe("Exemption types to request; reduces likelihood of a challenge"),
    acquiring_bank_fraud_rate: z
      .string()
      .optional()
      .describe(
        "Bank fraud rate threshold; required when requesting transaction_risk_analysis_exemption",
      ),
  })
  .describe("Additional parameters for the Spreedly 3DS2 Global authentication flow");

export const CartItemSchema = z
  .object({
    name: z.string().max(500).describe("Item name, max 500 chars"),
    quantity: z.number().positive().describe("Quantity purchased"),
    type: z
      .enum(["TANGIBLE", "NON_TANGIBLE"])
      .default("TANGIBLE")
      .describe("'TANGIBLE' for physical goods; 'NON_TANGIBLE' for digital / services"),
    price: z.string().describe("Final line-item price after discounts, as a string"),
  })
  .describe("Single cart line item for fraud protection checks");

export const ProtectionParametersSchema = z
  .object({
    // Required
    delivery_method: z.string().max(50).describe("Delivery method, e.g. 'FedEx', 'email'"),
    delivery_type: z
      .enum(["PHYSICAL", "DIGITAL"])
      .default("PHYSICAL")
      .describe("'PHYSICAL' for shipped goods; 'DIGITAL' for non-shipped"),
    cart_items: z.array(CartItemSchema).min(1).describe("All items being purchased"),

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
    fraud_token: z
      .string()
      .optional()
      .describe("Forter fraud token from the Spreedly iFrame; web transactions only"),
    forter_mobile_uid: z
      .string()
      .optional()
      .describe("Device UID (IMEI / IDFV); mobile transactions only"),
    user_agent: z.string().optional().describe("Customer browser User-Agent"),

    // Customer account
    customer_account_id: z
      .string()
      .optional()
      .describe("Customer UID in merchant system; omit for guests"),
    customer_account_type: z
      .enum([
        "GUEST",
        "PRIVATE",
        "BUSINESS",
        "VIP",
        "MERCHANT_OPERATED",
        "TRIAL",
        "MERCHANT_EMPLOYEE",
        "PREMIUM_PAID",
        "SMALL_BUSINESS",
        "AGENT",
        "BUSINESS_PRIVATE",
        "BUSINESS_PREMIUM_PAID",
      ])
      .default("BUSINESS")
      .optional()
      .describe("Customer account classification"),
    customer_account_creation_date: z
      .number()
      .optional()
      .describe("Account creation date as Unix epoch seconds (UTC)"),

    // Billing identity — falls back to payment method when available
    billing_name: z.string().optional().describe("Full billing name; falls back to payment method"),
    billing_first_name: z
      .string()
      .optional()
      .describe("Billing first name; falls back to payment method"),
    billing_last_name: z
      .string()
      .optional()
      .describe("Billing last name; falls back to payment method"),
    email: z.string().email().optional().describe("Customer email; falls back to payment method"),
    billing_country: z
      .string()
      .optional()
      .describe("Billing country; falls back to payment method"),
    billing_address1: z
      .string()
      .optional()
      .describe("Billing address line 1; falls back to payment method"),
    billing_address2: z
      .string()
      .optional()
      .describe("Billing address line 2; falls back to payment method"),
    billing_city: z.string().optional().describe("Billing city; falls back to payment method"),
    billing_zip: z.string().optional().describe("Billing ZIP; falls back to payment method"),
    billing_state: z.string().optional().describe("Billing state; falls back to payment method"),
    billing_phone_number: z
      .string()
      .optional()
      .describe("Billing phone; falls back to payment method"),

    // Shipping identity — falls back to payment method when available
    shipping_name: z
      .string()
      .optional()
      .describe("Full shipping name; falls back to payment method"),
    shipping_first_name: z
      .string()
      .optional()
      .describe("Shipping first name; falls back to payment method"),
    shipping_last_name: z
      .string()
      .optional()
      .describe("Shipping last name; falls back to payment method"),
    shipping_email: z
      .string()
      .email()
      .optional()
      .describe("Shipping email; falls back to payment method"),
    shipping_country: z
      .string()
      .optional()
      .describe("Shipping country; falls back to payment method"),
    shipping_address1: z
      .string()
      .optional()
      .describe("Shipping address line 1; falls back to payment method"),
    shipping_address2: z
      .string()
      .optional()
      .describe("Shipping address line 2; falls back to payment method"),
    shipping_city: z.string().optional().describe("Shipping city; falls back to payment method"),
    shipping_zip: z.string().optional().describe("Shipping ZIP; falls back to payment method"),
    shipping_state: z.string().optional().describe("Shipping state; falls back to payment method"),
    shipping_phone_number: z
      .string()
      .optional()
      .describe("Shipping phone; falls back to payment method"),
  })
  .describe(
    "Fraud protection parameters forwarded to the configured Protection Provider; " +
      "delivery_method, delivery_type, and cart_items are required",
  );

export const RecoverParamsSchema = z
  .object({
    gateway_tokens: z
      .array(z.string())
      .min(1)
      .describe("Ordered list of fallback gateway tokens to retry against"),
    mode: z
      .enum(["standard", "outage_only"])
      .optional()
      .describe("'standard' retries on any failure; 'outage_only' retries only on gateway outages"),
    custom_errors: z
      .object({
        error_codes: z.array(z.string()).optional().describe("Error codes that trigger a retry"),
        messages: z.array(z.string()).optional().describe("Error messages that trigger a retry"),
        additional_data: z
          .array(z.string())
          .optional()
          .describe("Additional values that trigger a retry"),
        override_default_error_codes: z
          .boolean()
          .optional()
          .describe("true to replace Spreedly defaults; false to extend them"),
      })
      .optional()
      .describe("Custom error conditions that trigger a Recover retry"),
  })
  .describe("Spreedly Recover config; retries a failed transaction against fallback gateways");

export const CommonGatewayTransactionFields = z.object({
  order_id: z
    .string()
    .optional()
    .describe("Merchant order ID; defaults to the Spreedly transaction token"),
  description: z
    .string()
    .optional()
    .describe("Human-readable description forwarded to the gateway if supported"),
  ip: z
    .string()
    .optional()
    .describe("Customer IP; defaults to '127.0.0.1'; set to 'omit' to send null"),
  email: z
    .string()
    .email()
    .optional()
    .describe("Overrides the customer email on the payment method for this transaction"),
  retain_on_success: z
    .boolean()
    .optional()
    .describe("Retain the payment method in the vault on success"),
  gateway_specific_fields: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Gateway-specific options nested under the gateway type key"),
  sub_merchant_key: z
    .string()
    .optional()
    .describe("Token of the sub-merchant to associate with this transaction"),
  sca_provider_key: z
    .string()
    .optional()
    .describe("SCA Provider token; triggers 3DS2 Global auth before the gateway call"),
  sca_authentication_parameters: ScaAuthenticationParametersSchema.optional(),
  callback_url: z.string().url().optional().describe("URL for async 3DS / offsite result delivery"),
  callback_format: z
    .enum(["json", "xml"])
    .optional()
    .describe("Format for callback delivery; defaults to 'xml'"),
  shipping_address: ShippingAddressSchema.optional(),
  billing_address: BillingAddressSchema.optional(),
  stored_credential_initiator: z
    .enum(["merchant", "cardholder"])
    .optional()
    .describe("Who is initiating this stored credential transaction"),
  stored_credential_reason_type: z
    .enum(["recurring", "unscheduled", "installment"])
    .optional()
    .describe("Reason the stored payment method is being charged"),
  attempt_network_token: z
    .boolean()
    .optional()
    .describe("true to transact with a network token (DPAN) if available"),
  provision_network_token: z
    .boolean()
    .optional()
    .describe("true to provision a network token during this transaction"),
  protection_provider_key: z
    .string()
    .optional()
    .describe("Protection Provider token; triggers a fraud check"),
  protection_parameters: ProtectionParametersSchema.optional(),
  transaction_metadata: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Key-value pairs for Smart Routing; keys ≤ 50 chars, values ≤ 500 chars"),
  allow_blank_name: z
    .boolean()
    .optional()
    .describe("Skip cardholder name validation for pass-in credit card transactions"),
  allow_expired_date: z
    .boolean()
    .optional()
    .describe("Skip expired date validation for pass-in credit card transactions"),
  allow_blank_date: z
    .boolean()
    .optional()
    .describe("Skip expiration date presence validation for pass-in credit card transactions"),
});
