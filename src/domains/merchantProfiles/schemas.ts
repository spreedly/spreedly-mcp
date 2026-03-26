import { z } from "zod";

const MerchantProfileCardDetailsSchema = z.object({
  acquirer_merchant_id: z
    .string()
    .describe("Merchant ID assigned by the acquiring bank for transaction reconciliation"),
  mcc: z.string().describe("4-digit Merchant Category Code classifying the business type"),
  merchant_name: z.string().describe("Merchant name as assigned by the acquiring bank"),
  country_code: z.string().min(4).describe("Country code in ISO 3166-1 numeric format"),
});

export const CreateMerchantProfileSchema = z
  .object({
    merchant_profile: z
      .object({
        description: z
          .string()
          .optional()
          .describe("A custom description to characterize the merchant profile"),
        sub_merchant_key: z
          .string()
          .optional()
          .describe("Token of an associated Sub-merchant, if one exists"),
        // At least one of these card network objects is required by the API
        visa: MerchantProfileCardDetailsSchema.optional(),
        mastercard: MerchantProfileCardDetailsSchema.optional(),
        amex: MerchantProfileCardDetailsSchema.optional(),
        discover: MerchantProfileCardDetailsSchema.optional(),
        diners: MerchantProfileCardDetailsSchema.optional(),
        jcb: MerchantProfileCardDetailsSchema.optional(),
        dankort: MerchantProfileCardDetailsSchema.optional(),
        union_pay: MerchantProfileCardDetailsSchema.optional(),
        cartes_bancaires: MerchantProfileCardDetailsSchema.optional(),
      })
      .describe(
        "Merchant profile data. At least one card network object (visa, mastercard, amex, etc.) must be provided.",
      ),
  })
  .strict();

export const ListMerchantProfilesSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token"),
    count: z.string().optional().describe("Number of merchant profiles to return"),
  })
  .strict();

export const ShowMerchantProfileSchema = z
  .object({
    merchant_profile_token: z.string().describe("The token of the merchant profile"),
  })
  .strict();

export const UpdateMerchantProfileSchema = z
  .object({
    merchant_profile_token: z.string().describe("The token of the merchant profile to update"),
    merchant_profile: z
      .object({
        description: z.string().optional().describe("Description for the merchant profile"),
      })
      .describe(
        "Only the description field can be updated. All other merchant profile fields are immutable after creation.",
      ),
  })
  .strict();
