import { z } from "zod";

export const CardRefresherInquirySchema = z
  .object({
    card_refresher_inquiry: z.object({
      payment_method_token: z
        .string()
        .describe("The token of the payment method to be inquired for update"),
      region: z.string().describe("The onboarded region where the payment method is processed"),
      updating_service: z
        .string()
        .optional()
        .describe("The updating service to use for the inquiry"),
    }),
  })
  .strict();

export const ShowCardRefresherInquirySchema = z
  .object({
    inquiry_token: z.string().describe("The token of the inquiry"),
  })
  .strict();

export const ListCardRefresherInquiriesSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token"),
    count: z.string().optional().describe("The number of inquiries to return"),
  })
  .strict();
