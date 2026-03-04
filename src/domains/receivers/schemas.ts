import { z } from "zod";

export const CreateReceiverSchema = z.object({
  receiver: z.object({
    receiver_type: z.string().describe("The type of receiver to create"),
    hostnames: z.string().optional().describe("Comma-separated list of hostnames"),
    credentials: z.array(z.object({
      name: z.string(),
      value: z.string(),
      safe: z.boolean().optional(),
    })).optional().describe("Receiver credentials"),
  }),
}).strict();

export const ListReceiversSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
  order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
}).strict();

export const ShowReceiverSchema = z.object({
  receiver_token: z.string().describe("The token of the receiver"),
}).strict();

export const UpdateReceiverSchema = z.object({
  receiver_token: z.string().describe("The token of the receiver to update"),
  receiver: z.object({
    hostnames: z.string().optional(),
    credentials: z.array(z.object({
      name: z.string(),
      value: z.string(),
      safe: z.boolean().optional(),
    })).optional(),
  }),
}).strict();

export const RedactReceiverSchema = z.object({
  receiver_token: z.string().describe("The token of the receiver to redact"),
}).strict();

export const DeliverReceiverSchema = z.object({
  receiver_token: z.string().describe("The token of the receiver"),
  payment_method_token: z.string().describe("The token of the payment method to deliver"),
  url: z.string().describe("The URL to deliver the payment method to"),
  headers: z.string().optional().describe("Custom request headers"),
  body: z.string().describe("Request body template with payment method placeholders"),
}).strict();

export const ExportReceiverSchema = z.object({
  receiver_token: z.string().describe("The token of the receiver"),
  payment_method_token: z.string().describe("The token of the payment method to export"),
}).strict();
