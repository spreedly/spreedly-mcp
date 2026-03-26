import { z } from "zod";
import {
  CreditCardSchema,
  BankAccountSchema,
  ApplePaySchema,
  GooglePaySchema,
} from "../commons/schemas";

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
