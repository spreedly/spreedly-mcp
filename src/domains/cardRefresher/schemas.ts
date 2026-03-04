import { z } from "zod";

export const CardRefresherInquirySchema = z.object({
  payment_method_tokens: z.array(z.string()).optional().describe("Array of payment method tokens to inquire about"),
  all: z.boolean().optional().describe("Set to true to inquire about all eligible payment methods"),
}).strict();

export const ShowCardRefresherInquirySchema = z.object({
  inquiry_token: z.string().describe("The token of the inquiry"),
}).strict();

export const ListCardRefresherInquiriesSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
}).strict();
