import { describe, it, expect } from "vitest";
import {
  CreatePaymentMethodSchema,
  RecachePaymentMethodSchema,
} from "../../src/domains/paymentMethods/schemas";

describe("paymentMethods schema constraints", () => {
  describe("CreatePaymentMethodSchema", () => {
    it("rejects unknown fields via strict", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          credit_card: {
            first_name: "Test",
            last_name: "User",
            number: "4111111111111111",
            month: 12,
            year: 2030,
          },
        },
        rogue_field: "injection",
      });
      expect(result.success).toBe(false);
    });
    it("rejects credit_card when full_name and first_name/last_name are all missing", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          credit_card: {
            number: "4111111111111111",
            month: "12",
            year: "2030",
          },
        },
      });
      expect(result.success).toBe(false);
    });
    it("accepts credit_card with full_name only", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          credit_card: {
            number: "4111111111111111",
            month: "12",
            year: "2030",
            full_name: "Test User",
          },
        },
      });
      expect(result.success).toBe(true);
    });
    it("rejects credit_card with only first_name (last_name missing)", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          credit_card: {
            number: "4111111111111111",
            month: "12",
            year: "2030",
            first_name: "Test",
          },
        },
      });
      expect(result.success).toBe(false);
    });
    it("accepts bank_account with full_name", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          bank_account: {
            bank_account_number: "123456789",
            bank_routing_number: "021000021",
            full_name: "Test User",
          },
        },
      });
      expect(result.success).toBe(true);
    });
    it("rejects bank_account with invalid bank_account_type", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          bank_account: {
            bank_account_number: "123456789",
            bank_routing_number: "021000021",
            full_name: "Test User",
            bank_account_type: "money_market",
          },
        },
      });
      expect(result.success).toBe(false);
    });
    it("rejects payment method without payment details", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          email: "customer_email@test.com",
          retained: true,
          data: {
            additional: "metadata",
          },
        },
      });
      expect(result.success).toBe(false);
    });
    it("reject payment method with missing third party token details", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          payment_method_type: "third_party_token",
          reference: "token_reference",
        },
      });
      expect(result.success).toBe(false);
    });
    it("accepts payment method with third party token details", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          payment_method_type: "third_party_token",
          reference: "token_reference",
          gateway_type: "test",
        },
      });
      expect(result.success).toBe(true);
    });
    it("rejects metadata with more than 25 key-value pairs", () => {
      const metadata: Record<string, string> = {};
      for (let i = 0; i < 26; i += 1) {
        metadata[`k${i}`] = "v";
      }
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          payment_method_type: "third_party_token",
          reference: "token_reference",
          gateway_type: "test",
          metadata,
        },
      });
      expect(result.success).toBe(false);
    });
    it("reject payment method with a metadata value exceeding 500 chars", () => {
      const result = CreatePaymentMethodSchema.safeParse({
        payment_method: {
          payment_method_type: "third_party_token",
          reference: "token_reference",
          gateway_type: "test",
          metadata: { k: "a".repeat(501) },
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe("RecachePaymentMethodSchema", () => {
    it("rejects payment method recache without ", () => {
      const result = RecachePaymentMethodSchema.safeParse({
        payment_method_token: "PM_Token",
        payment_method: {
          credit_card: {},
        },
      });
      expect(result.success).toBe(false);
    });
  });
});
