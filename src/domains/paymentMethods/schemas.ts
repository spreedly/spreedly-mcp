import { z } from "zod";

const MetadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .describe("metadata key-value pairs of additional metadata")
  .refine((val) => Object.keys(val).length <= 25, {
    message: "Metadata cannot have more than 25 key-value pairs",
  })
  .refine((val) => Object.keys(val).every((k) => k.length <= 50), {
    message: "Metadata keys must be 50 characters or fewer",
  })
  .refine(
    (val) => Object.values(val).every((v) => typeof v !== "object" && String(v).length <= 500),
    {
      message:
        "Metadata values must be 500 characters or fewer and cannot be compounding data types",
    },
  );

const CreditCardSchema = z
  .object({
    number: z
      .string()
      .describe(
        "Full card number (PAN) - sensitive cardholder data, required for tokenization only",
      ),
    month: z.string().describe("Expiration month"),
    year: z.string().describe("Expiration year"),
    first_name: z.string().optional().describe("Cardholder first name"),
    last_name: z.string().optional().describe("Cardholder last name"),
    full_name: z.string().optional().describe("Cardholder Full name"),
    verification_value: z
      .string()
      .optional()
      .describe("Card security code (CVV/CVC) - sensitive, do not store or log"),
    company: z.string().optional().describe("company name associated with the credit card"),
    address1: z.string().optional().describe("first line of the billing address"),
    address2: z.string().optional().describe("second line of the billing address"),
    city: z.string().optional().describe("city of the billing address"),
    state: z.string().optional().describe("state of the billing address"),
    zip: z.string().optional().describe("zip code of the billing address"),
    country: z.string().optional().describe("country code of the billing address"),
    phone_number: z.string().optional().describe("phone number of the billing address"),
    shipping_address1: z.string().optional().describe("first line of the shipping address"),
    shipping_address2: z.string().optional().describe("second line of the shipping address"),
    shipping_city: z.string().optional().describe("city of the shipping address"),
    shipping_state: z.string().optional().describe("state of the shipping address"),
    shipping_zip: z.string().optional().describe("zip code of the shipping address"),
    shipping_country: z.string().optional().describe("country code of the shipping address"),
    shipping_phone_number: z.string().optional().describe("phone number of the shipping address"),
  })
  .describe("Credit card details")
  .refine(
    (data) => data.full_name || (data.first_name !== undefined && data.last_name !== undefined),
    {
      message:
        "Either full_name or both first_name and last_name are required (unless allow_blank_name is true)",
      path: ["first_name"],
    },
  );

const BankAccountSchema = z
  .object({
    bank_account_number: z.string().describe("Bank routing number"),
    bank_routing_number: z
      .string()
      .describe("Full bank account number - sensitive, required for tokenization only"),
    first_name: z.string().optional().describe("Account holder first name"),
    last_name: z.string().optional().describe("Account holder last name"),
    full_name: z.string().optional().describe("Account holder full name"),
    bank_account_type: z.enum(["checking", "savings"]).optional().describe("Type of account"),
    bank_account_holder_type: z
      .enum(["business", "personal"])
      .optional()
      .describe("Account holder type"),
  })
  .describe("Bank account details")
  .refine(
    (data) => data.full_name || (data.first_name !== undefined && data.last_name !== undefined),
    {
      message: "Either full_name or both first_name and last_name are required",
      path: ["first_name"],
    },
  );

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

const ApplePaySchema = z
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

const GooglePaySchema = z
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

export const CreatePaymentMethodSchema = z
  .object({
    payment_method: z.object({
      credit_card: CreditCardSchema.optional(),
      bank_account: BankAccountSchema.optional(),
      apple_pay: ApplePaySchema.optional(),
      google_pay: GooglePaySchema.optional(),
      payment_method_type: z
        .literal("third_party_token")
        .optional()
        .describe(
          "set to third_party_token to represent an externally vaulted payment method reference",
        ),
      reference: z
        .string()
        .optional()
        .describe("The token identifying the payment method at the external gateway"),
      gateway_type: z.string().optional().describe("The type of the external gateway"),
      email: z.string().email().optional().describe("Customer email"),
      retained: z.boolean().optional().describe("Whether to retain immediately"),
      allow_blank_name: z
        .boolean()
        .optional()
        .describe("whether to skip the name validation requirement"),
      allow_expired_date: z
        .boolean()
        .optional()
        .describe("Whether to skip the expired date validation requirement"),
      allow_blank_date: z
        .boolean()
        .optional()
        .describe("Whether to skip the expiration date validation requirement"),
      eligible_for_card_updater: z
        .boolean()
        .optional()
        .describe("Whether to be included in Account Updater"),
      metadata: MetadataSchema.optional(),
      provision_network_token: z
        .boolean()
        .optional()
        .describe("true if this transaction should attempt to provision a network token."),
    }),
  })
  .describe("Payment method details")
  .superRefine((data, ctx) => {
    const hasPaymentType =
      data.payment_method.credit_card ||
      data.payment_method.bank_account ||
      data.payment_method.apple_pay ||
      data.payment_method.google_pay ||
      data.payment_method.payment_method_type === "third_party_token";

    if (!hasPaymentType) {
      ctx.addIssue({
        code: "custom",
        message: "At least one payment type must be provided",
      });
    }

    // Also enforce third party token coherence
    if (data.payment_method.payment_method_type === "third_party_token") {
      if (!data.payment_method.reference) {
        ctx.addIssue({
          code: "custom",
          path: ["reference"],
          message: "reference is required for third_party_token",
        });
      }
      if (!data.payment_method.gateway_type) {
        ctx.addIssue({
          code: "custom",
          path: ["gateway_type"],
          message: "gateway_type is required for third_party_token",
        });
      }
    }
  });

export const ListPaymentMethodsSchema = z
  .object({
    since_token: z.string().optional().describe("Pagination token"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    metadata: z.record(z.string(), z.string()).optional().describe("A metadata key/value pair"),
    state: z
      .enum(["retained", "redacted", "cached", "used"])
      .optional()
      .describe("The list of storage_states"),
    count: z.string().optional().describe("The number of payment methods to return"),
  })
  .strict();

export const ShowPaymentMethodSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method"),
  })
  .strict();

export const UpdatePaymentMethodSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method"),
    payment_method: z
      .object({
        first_name: z.string().optional().describe("Cardholder first name"),
        last_name: z.string().optional().describe("Cardholder last name"),
        email: z.string().optional().describe("Customer Email"),
        month: z.number().int().min(1).max(12).optional().describe("Expiration Month"),
        year: z.number().int().optional().describe("Expiration year"),
        address1: z.string().optional().describe("first line of the billing address"),
        address2: z.string().optional().describe("second line of the billing address"),
        city: z.string().optional().describe("city of the billing address"),
        state: z.string().optional().describe("state of the billing address"),
        zip: z.string().optional().describe("zip code of the billing address"),
        country: z.string().optional().describe("country of the billing address"),
        phone_number: z.string().optional().describe("phone numer of the billing address"),
        company: z.string().optional().describe("company name associated with the credit card"),
        shipping_address1: z.string().optional().describe("first line of the shipping address"),
        shipping_address2: z.string().optional().describe("second line of the shipping address"),
        shipping_city: z.string().optional().describe("city of the shipping address"),
        shipping_state: z.string().optional().describe("state of the shipping address"),
        shipping_zip: z.string().optional().describe("zip code of the shipping address"),
        shipping_country: z.string().optional().describe("country of the shipping address"),
        allow_blank_name: z
          .boolean()
          .optional()
          .describe("whether to skip the name validation requirement"),
        allow_expired_date: z
          .boolean()
          .optional()
          .describe("Whether to skip the expired date validation requirement"),
        allow_blank_date: z
          .boolean()
          .optional()
          .describe("Whether to skip the expiration date validation requirement"),
        eligible_for_card_updater: z
          .boolean()
          .optional()
          .describe("Whether to be included in Account Updater"),
        metadata: MetadataSchema.optional(),
      })
      .describe("Fields to update"),
  })
  .strict();

export const RetainPaymentMethodSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method to retain"),
  })
  .strict();

export const RecachePaymentMethodSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method"),
    payment_method: z.object({
      credit_card: z.object({
        verification_value: z
          .string()
          .describe("Card security code (CVV/CVC) to recache - sensitive, do not store or log"),
      }),
      allow_blank_name: z.boolean().optional(),
      allow_expired_date: z.boolean().optional(),
      allow_blank_date: z.boolean().optional(),
    }),
  })
  .strict();

export const ListPaymentMethodTransactionsSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method"),
    since_token: z.string().optional().describe("Pagination token"),
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
  })
  .strict();

export const ListPaymentMethodEventsSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method"),
    since_token: z.string().optional().describe("Pagination token"),
    count: z.string().optional().describe("The number of events to return"),
    include_transactions: z
      .boolean()
      .optional()
      .describe("Whether to include gateway transactions "),
  })
  .strict();

export const DeletePaymentMethodMetadataSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method"),
    keys: z.array(z.string()).min(1),
  })
  .strict();

export const UpdateGratisSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the payment method"),
    payment_method: z
      .object({
        managed: z.boolean().optional().describe("Whether the payment method is managed"),
        eligible_for_card_updater: z.boolean().optional().describe("Include in Account Updater"),
        not_eligible_for_card_updater: z
          .boolean()
          .optional()
          .describe("Exclude from Account Updater"),
        allow_blank_name: z.boolean().optional().describe("Skip name validation requirement"),
        allow_expired_date: z.boolean().optional().describe("Skip expired date validation"),
        allow_blank_date: z.boolean().optional().describe("Skip expiration date validation"),
      })
      .describe("Fields to update (boolean flags only)"),
  })
  .strict();

export const ShowPaymentMethodEventSchema = z
  .object({
    event_token: z.string().describe("The token of the event"),
  })
  .strict();

export const ListAllPaymentMethodEventsSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token"),
    event_type: z.string().optional().describe("Event Type"),
    count: z.string().optional().describe("The number of events to return"),
    include_transactions: z
      .boolean()
      .optional()
      .describe("Whether to include gateway transactions "),
  })
  .strict();
