import { z } from "zod";

const MerchantDataItemSchema = z.object({
  acquirer_merchant_id: z
    .string()
    .describe("Required. The Merchant ID assigned by the acquiring bank"),
  card_network: z
    .string()
    .optional()
    .describe("The card network this merchant data entry applies to (e.g. visa, mastercard)"),
  acquirer_bin: z
    .string()
    .optional()
    .describe("Acquirer Bank Identification Number (first 4-6 digits of card number)"),
  business_id: z
    .string()
    .optional()
    .describe("The merchant's business/company/service ID specific to the card network"),
  mcc: z.string().optional().describe("4-digit Merchant Category Code"),
});

const SubMerchantAddressSchema = z.object({
  address1: z.string().optional().describe("First line of the merchant's address"),
  address2: z.string().optional().describe("Second line of the merchant's address"),
  city: z.string().optional().describe("City"),
  state: z.string().optional().describe("State"),
  zip: z.string().optional().describe("Zip code"),
  country: z.string().optional().describe("Country code in ISO 3166-1 numeric format"),
});

export const CreateSubMerchantSchema = z
  .object({
    sub_merchant: z
      .object({
        name: z.string().describe("Required. The human-readable name of the sub-merchant"),
        environment_key: z
          .string()
          .describe("Required. The key of the environment to associate this sub-merchant with"),
        merchant_url: z.string().optional().describe("The merchant's website URL"),
        merchant_email: z.string().optional().describe("Email address for the merchant"),
        ein: z
          .string()
          .optional()
          .describe("Employer Identification Number associated with the merchant"),
        merchant_defined_uid: z
          .string()
          .optional()
          .describe("Custom string to identify the sub-merchant in external systems"),
        merchant_data: z
          .array(MerchantDataItemSchema)
          .optional()
          .describe(
            "Array of merchant data objects per card network. acquirer_merchant_id is required in each item.",
          ),
        address: SubMerchantAddressSchema.optional().describe("The merchant's address"),
        metadata: z
          .record(z.string(), z.string())
          .optional()
          .describe(
            "Key-value metadata (max 25 pairs; keys ≤50 chars, values ≤500 chars, no nested objects)",
          ),
      })
      .describe("Sub-merchant configuration"),
  })
  .strict();

export const ListSubMerchantsSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token"),
    count: z.string().optional().describe("Number of sub_merchants to return"),
  })
  .strict();

export const ShowSubMerchantSchema = z
  .object({
    sub_merchant_key: z.string().describe("The key of the sub-merchant"),
  })
  .strict();

export const UpdateSubMerchantSchema = z
  .object({
    sub_merchant_key: z.string().describe("The key of the sub-merchant to update"),
    sub_merchant: z
      .object({
        name: z.string().optional().describe("Updated human-readable name"),
        merchant_url: z.string().optional().describe("Updated website URL"),
        merchant_email: z.string().optional().describe("Updated email address"),
        ein: z.string().optional().describe("Updated Employer Identification Number"),
        merchant_defined_uid: z.string().optional().describe("Updated external system identifier"),
        merchant_data: z
          .array(MerchantDataItemSchema)
          .optional()
          .describe("Updated merchant data array. acquirer_merchant_id required in each item."),
        address: SubMerchantAddressSchema.optional().describe("Updated address"),
        metadata: z
          .record(z.string(), z.string())
          .optional()
          .describe("Updated metadata key-value pairs"),
      })
      .describe("Fields to update on the sub-merchant"),
  })
  .strict();
