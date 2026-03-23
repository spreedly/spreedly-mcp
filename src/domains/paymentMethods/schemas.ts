import { z } from "zod";

const MetadataSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
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
    number: z.string(),
    month: z.string(),
    year: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    verification_value: z.string().optional(),
    company: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
    country: z.string().optional(),
    phone_number: z.string().optional(),
    shipping_address1: z.string().optional(),
    shipping_address2: z.string().optional(),
    shipping_city: z.string().optional(),
    shipping_state: z.string().optional(),
    shipping_zip: z.string().optional(),
    shipping_country: z.string().optional(),
    shipping_phone_number: z.string().optional(),
  })
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
    bank_account_number: z.string(),
    bank_routing_number: z.string(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    full_name: z.string().optional(),
    bank_account_type: z.enum(["checking", "savings"]).optional(),
    bank_account_holder_type: z.enum(["business", "personal"]).optional(),
  })
  .refine(
    (data) => data.full_name || (data.first_name !== undefined && data.last_name !== undefined),
    {
      message: "Either full_name or both first_name and last_name are required",
      path: ["first_name"],
    },
  );

const ApplePayPaymentDataSchema = z.object({
  version: z.any().optional(),
  data: z.any().optional(),
  signature: z.any().optional(),
  header: z
    .object({
      ephemeralPublicKey: z.any().optional(),
      transactionId: z.any().optional(),
      publicKeyHash: z.any().optional(),
    })
    .optional(),
});

const ApplePaySchema = z.object({
  payment_data: ApplePayPaymentDataSchema,
  test_card_number: z.string().optional(),
});

const GooglePayPaymentDataSchema = z.object({
  signature: z.string().optional(),
  protocolVersion: z.string().optional(),
  signedMessage: z.string().optional(),
});

const GooglePaySchema = z.object({
  payment_data: GooglePayPaymentDataSchema,
  test_card_number: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  address_1: z.string().optional(),
  address_2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  country: z.string().optional(),
});

export const CreatePaymentMethodSchema = z
  .object({
    payment_method: z.object({
      credit_card: CreditCardSchema.optional(),
      bank_account: BankAccountSchema.optional(),
      apple_pay: ApplePaySchema.optional(),
      google_pay: GooglePaySchema.optional(),
      payment_method_type: z.literal("third_party_token").optional(),
      reference: z.string().optional(),
      gateway_type: z.string().optional(),
      email: z.string().email().optional(),
      retained: z.boolean().optional(),
      allow_blank_name: z.boolean().optional(),
      allow_expired_date: z.boolean().optional(),
      allow_blank_date: z.boolean().optional(),
      eligible_for_card_updater: z.boolean().optional(),
      metadata: MetadataSchema.optional(),
      provision_network_token: z.boolean().optional(),
    }),
  })
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
        first_name: z.string().optional(),
        last_name: z.string().optional(),
        email: z.string().optional(),
        data: z.record(z.string(), z.unknown()).optional(),
        month: z.number().int().min(1).max(12).optional(),
        year: z.number().int().optional(),
        address1: z.string().optional(),
        address2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zip: z.string().optional(),
        country: z.string().optional(),
        phone_number: z.string().optional(),
        company: z.string().optional(),
        shipping_address1: z.string().optional(),
        shipping_address2: z.string().optional(),
        shipping_city: z.string().optional(),
        shipping_state: z.string().optional(),
        shipping_zip: z.string().optional(),
        shipping_country: z.string().optional(),
        callback_url: z.string().url().optional(),
        allow_blank_name: z.boolean().optional(),
        allow_expired_date: z.boolean().optional(),
        allow_blank_date: z.boolean().optional(),
        eligible_for_card_updater: z.boolean().optional(),
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
        verification_value: z.string().describe("Card security code (CVV/CVC) to recache"),
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
