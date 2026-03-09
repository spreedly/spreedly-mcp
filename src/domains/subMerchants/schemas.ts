import { z } from "zod";

export const CreateSubMerchantSchema = z.object({
  sub_merchant: z.record(z.string(), z.unknown()).describe("Sub-merchant configuration"),
}).strict();

export const ListSubMerchantsSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
}).strict();

export const ShowSubMerchantSchema = z.object({
  sub_merchant_key: z.string().describe("The key of the sub-merchant"),
}).strict();

export const UpdateSubMerchantSchema = z.object({
  sub_merchant_key: z.string().describe("The key of the sub-merchant to update"),
  sub_merchant: z.record(z.string(), z.unknown()).describe("Fields to update"),
}).strict();
