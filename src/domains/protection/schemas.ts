import { z } from "zod";

export const ForwardClaimSchema = z.object({
  transaction_token: z.string().describe("The token of the transaction to submit the claim for"),
  claim: z.record(z.unknown()).describe("Claim data to forward to the protection provider"),
}).strict();

export const ListProtectionEventsSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
}).strict();

export const ShowProtectionEventSchema = z.object({
  event_token: z.string().describe("The token of the protection event"),
}).strict();

export const CreateProtectionProviderSchema = z.object({
  protection_provider: z.record(z.unknown()).describe("Protection provider configuration"),
}).strict();

export const ShowProtectionProviderSchema = z.object({
  protection_provider_token: z.string().describe("The token of the protection provider"),
}).strict();
