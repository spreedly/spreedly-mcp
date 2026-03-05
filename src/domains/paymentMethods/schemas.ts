import { z } from "zod";

export const CreatePaymentMethodSchema = z.object({
  payment_method: z.object({
    credit_card: z.object({
      first_name: z.string().describe("Cardholder first name"),
      last_name: z.string().describe("Cardholder last name"),
      number: z.string().describe("Full card number (PAN) - sensitive cardholder data, required for tokenization only"),
      month: z.number().int().min(1).max(12).describe("Expiration month"),
      year: z.number().int().describe("Expiration year"),
      verification_value: z.string().optional().describe("Card security code (CVV/CVC) - sensitive, do not store or log"),
    }).optional().describe("Credit card details"),
    bank_account: z.object({
      bank_routing_number: z.string().describe("Bank routing number"),
      bank_account_number: z.string().describe("Full bank account number - sensitive, required for tokenization only"),
      bank_account_holder_type: z.enum(["personal", "business"]).optional(),
      bank_account_type: z.enum(["checking", "savings"]).optional(),
      first_name: z.string().describe("Account holder first name"),
      last_name: z.string().describe("Account holder last name"),
    }).optional().describe("Bank account details"),
    email: z.string().optional().describe("Customer email"),
    data: z.record(z.unknown()).optional().describe("Additional metadata"),
    retained: z.boolean().optional().describe("Whether to retain immediately"),
  }).describe("Payment method details"),
}).strict();

export const ListPaymentMethodsSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
  order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
}).strict();

export const ShowPaymentMethodSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
}).strict();

export const UpdatePaymentMethodSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  payment_method: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    email: z.string().optional(),
    data: z.record(z.unknown()).optional(),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().optional(),
  }).describe("Fields to update"),
}).strict();

export const RetainPaymentMethodSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method to retain"),
}).strict();

export const RedactPaymentMethodSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method to redact"),
}).strict();

export const RecachePaymentMethodSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  payment_method: z.object({
    credit_card: z.object({
      verification_value: z.string().describe("Card security code (CVV/CVC) to recache - sensitive, do not store or log"),
    }),
  }),
}).strict();

export const ListPaymentMethodTransactionsSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  since_token: z.string().optional().describe("Pagination token"),
  order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
}).strict();

export const ListPaymentMethodEventsSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  since_token: z.string().optional().describe("Pagination token"),
}).strict();

export const DeletePaymentMethodMetadataSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
}).strict();

export const UpdateGratisSchema = z.object({
  payment_method_token: z.string().describe("The token of the payment method"),
  payment_method: z.object({
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    number: z.string().optional().describe("Updated card number (PAN) - sensitive cardholder data"),
    month: z.number().int().min(1).max(12).optional(),
    year: z.number().int().optional(),
  }).describe("Fields to update"),
}).strict();

export const ShowPaymentMethodEventSchema = z.object({
  event_token: z.string().describe("The token of the event"),
}).strict();

export const ListAllPaymentMethodEventsSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
}).strict();
