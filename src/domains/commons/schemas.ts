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
    number:             z.string().min(12).max(19).describe("Full PAN; tokenized by Spreedly"),
    month:              z.string().regex(/^(0?[1-9]|1[0-2])$/).describe("Expiration month, e.g. '12'"),
    year:               z.string().regex(/^\d{4}$/).describe("4-digit expiration year, e.g. '2030'"),
    first_name:         z.string().optional().describe("Cardholder first name; required if full_name is omitted"),
    last_name:          z.string().optional().describe("Cardholder last name; required if full_name is omitted"),
    full_name:          z.string().optional().describe("Full name; parsed into first_name / last_name by Spreedly"),
    verification_value: z.string().min(3).max(4).optional().describe("CVV / CVC code"),
    company:            z.string().optional().describe("Company on the card"),
    address1:           z.string().optional().describe("Billing address line 1"),
    address2:           z.string().optional().describe("Billing address line 2"),
    city:               z.string().optional().describe("Billing city"),
    state:              z.string().optional().describe("Billing state"),
    zip:                z.string().optional().describe("Billing ZIP code"),
    country:            z.string().optional().describe("Billing country code"),
    phone_number:       z.string().optional().describe("Billing phone number"),
    shipping_address1:  z.string().optional().describe("Shipping address line 1"),
    shipping_address2:  z.string().optional().describe("Shipping address line 2"),
    shipping_city:      z.string().optional().describe("Shipping city"),
    shipping_state:     z.string().optional().describe("Shipping state"),
    shipping_zip:       z.string().optional().describe("Shipping ZIP code"),
    shipping_country:   z.string().optional().describe("Shipping country code"),
    shipping_phone_number: z.string().optional().describe("Shipping phone number"),
  })
  .refine(
    (data) => Boolean(data.first_name && data.last_name) || Boolean(data.full_name),
    { message: "Provide either first_name + last_name or full_name" }
  )
  .describe("Credit card details");

// ---------------------------------------------------------------------------
// Used by: PurchaseRequest, CreatePaymentMethodRequest
// ---------------------------------------------------------------------------
export const BankAccountSchema = z
  .object({
    bank_account_number:      z.string().min(1).describe("Bank account number"),
    bank_routing_number:      z.string().length(9).regex(/^\d{9}$/).describe("9-digit ABA routing number"),
    first_name:               z.string().optional().describe("Account owner first name; required if full_name is omitted"),
    last_name:                z.string().optional().describe("Account owner last name; required if full_name is omitted"),
    full_name:                z.string().optional().describe("Full name; parsed into first_name / last_name"),
    bank_account_type:        z.enum(["checking", "savings"]).optional().describe("Account type"),
    bank_account_holder_type: z.enum(["business", "personal"]).optional().describe("Account holder type"),
  })
  .refine(
    (data) => Boolean(data.first_name && data.last_name) || Boolean(data.full_name),
    { message: "Provide either first_name + last_name or full_name" }
  )
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
