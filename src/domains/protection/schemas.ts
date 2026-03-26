import { z } from "zod";

// Shared card-network details schema for protection providers.
// Each card-network object requires acquirer_bin and merchant_url.
const ProtectionCardDetailsSchema = z.object({
  acquirer_bin: z
    .string()
    .describe(
      "The Acquirer BIN: the acquiring bank's identification number used to route authorizations.",
    ),
  merchant_url: z
    .string()
    .url()
    .describe(
      "Fully qualified URL of the merchant's website or customer-care site; must contain a method of contact.",
    ),
  merchant_password: z
    .string()
    .optional()
    .describe(
      "Legacy 3DS v1 parameter; only needed by merchants already using 3DS v1 and migrating to Spreedly 3DS.",
    ),
});

// Visa extends card details with an optional merchant_brand_id for DAF enablement.
const ProtectionVisaDetailsSchema = ProtectionCardDetailsSchema.extend({
  merchant_brand_id: z
    .string()
    .optional()
    .describe(
      "Merchant ID issued by Visa. When provided in the `visa` object, enables DAF (Digital Authentication Framework) via 3DS2 Global.",
    ),
});

export const ForwardClaimSchema = z
  .object({
    transaction_token: z.string().describe("The token of the transaction to submit the claim for"),
    claim: z
      .record(z.string(), z.unknown())
      .describe("Claim data to forward to the protection provider"),
  })
  .strict();

export const ListProtectionEventsSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token"),
    count: z.string().optional().describe("Number of events to return"),
    state: z.enum(["pending", "succeeded", "failed"]).optional().describe("Filter events by state"),
  })
  .strict();

export const ShowProtectionEventSchema = z
  .object({
    event_token: z.string().describe("The token of the protection event"),
  })
  .strict();

export const CreateProtectionProviderSchema = z
  .object({
    merchant_profile_key: z
      .string()
      .describe("Token of the Merchant Profile to associate this Protection Provider with"),
    type: z
      .enum(["spreedly", "test"])
      .describe(
        "Type of Protection Provider being created. Use `spreedly` for production fraud protection or `test` for integration testing.",
      ),
    three_ds_enabled: z
      .boolean()
      .optional()
      .describe(
        "When `true`, enables Spreedly 3DS2 Global authentication as part of the protection check.",
      ),
    visa: ProtectionVisaDetailsSchema.optional().describe(
      "Visa card-network registration. Required if Visa transactions should be covered by this provider.",
    ),
    mastercard: ProtectionCardDetailsSchema.optional().describe(
      "Mastercard card-network registration.",
    ),
    amex: ProtectionCardDetailsSchema.optional().describe(
      "American Express card-network registration.",
    ),
    discover: ProtectionCardDetailsSchema.optional().describe(
      "Discover card-network registration.",
    ),
    diners: ProtectionCardDetailsSchema.optional().describe(
      "Diners Club card-network registration.",
    ),
    jcb: ProtectionCardDetailsSchema.optional().describe("JCB card-network registration."),
    dankort: ProtectionCardDetailsSchema.optional().describe("Dankort card-network registration."),
    union_pay: ProtectionCardDetailsSchema.optional().describe(
      "UnionPay card-network registration.",
    ),
    cartes_bancaires: ProtectionCardDetailsSchema.optional().describe(
      "Cartes Bancaires card-network registration.",
    ),
  })
  .describe(
    "Protection Provider configuration. `merchant_profile_key` and `type` are required. At least one card-network object must also be included.",
  )
  .strict();

export const ShowProtectionProviderSchema = z
  .object({
    protection_provider_token: z.string().describe("The token of the protection provider"),
  })
  .strict();
