import { z } from "zod";

export const CardMetadataSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the network-tokenized payment method"),
  })
  .strict();

export const TokenStatusSchema = z
  .object({
    payment_method_token: z.string().describe("The token of the network-tokenized payment method"),
  })
  .strict();
