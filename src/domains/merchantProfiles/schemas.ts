import { z } from "zod";

export const CreateMerchantProfileSchema = z.object({
  merchant_profile: z.record(z.unknown()).describe("Merchant profile configuration"),
}).strict();

export const ListMerchantProfilesSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
}).strict();

export const ShowMerchantProfileSchema = z.object({
  merchant_profile_token: z.string().describe("The token of the merchant profile"),
}).strict();

export const UpdateMerchantProfileSchema = z.object({
  merchant_profile_token: z.string().describe("The token of the merchant profile to update"),
  merchant_profile: z.record(z.unknown()).describe("Fields to update"),
}).strict();
