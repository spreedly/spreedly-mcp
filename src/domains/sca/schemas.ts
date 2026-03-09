import { z } from "zod";

export const ScaAuthenticateSchema = z
  .object({
    sca_provider_key: z.string().describe("The key of the SCA provider"),
    payment_method_token: z.string().describe("The token of the payment method to authenticate"),
    transaction: z
      .record(z.string(), z.unknown())
      .optional()
      .describe("Transaction details for the authentication"),
  })
  .strict();

export const CreateScaProviderSchema = z
  .object({
    sca_provider: z.record(z.string(), z.unknown()).describe("SCA provider configuration"),
  })
  .strict();

export const ShowScaProviderSchema = z
  .object({
    sca_provider_token: z.string().describe("The token of the SCA provider"),
  })
  .strict();
