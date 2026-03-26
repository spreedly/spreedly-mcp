import { z } from "zod";

// Shared card-network details for SCA providers.
const ScaCardDetailsSchema = z.object({
  acquirer_bin: z
    .string()
    .describe(
      "Acquirer BIN: the acquiring bank's identification number used to route authorizations.",
    ),
  merchant_url: z
    .string()
    .url()
    .describe(
      "Fully qualified URL of the merchant's website or customer-care site containing a method of contact.",
    ),
  merchant_password: z
    .string()
    .optional()
    .describe(
      "Legacy 3DS v1 parameter; only needed by merchants already activated on 3DS v1 who are migrating.",
    ),
});

// Visa extends the base with an optional merchant_brand_id for DAF enablement.
const ScaVisaDetailsSchema = ScaCardDetailsSchema.extend({
  merchant_brand_id: z
    .string()
    .optional()
    .describe(
      "Merchant ID issued by Visa. When provided, enables DAF (Digital Authentication Framework) via 3DS2 Global.",
    ),
});

export const ScaAuthenticateSchema = z
  .object({
    sca_provider_key: z
      .string()
      .describe("Token of the SCA Provider to authenticate against (path parameter)"),
    payment_method_token: z
      .string()
      .describe("Token of the payment method to authenticate"),
    browser_info: z
      .string()
      .describe(
        "Serialized browser data gathered via `Spreedly.ThreeDS.serialize`. Required for web-based 3DS2 Global flows; may be omitted for test scenarios.",
      ),
    currency_code: z
      .string()
      .length(3)
      .optional()
      .describe("ISO 4217 currency code for the transaction being authenticated (e.g., 'USD')."),
    amount: z
      .number()
      .int()
      .positive()
      .optional()
      .describe("Amount in cents for the transaction being authenticated (e.g., 1000 = $10.00)."),
    test_scenario: z
      .object({
        scenario: z
          .string()
          .describe(
            "Test-flow scenario name. Refer to Spreedly's 3DS2 Global Testing Guide for valid values.",
          ),
      })
      .optional()
      .describe("Test-only: specifies a 3DS2 test-flow scenario to exercise."),
    force_daf: z
      .boolean()
      .optional()
      .describe(
        "When `true`, forces Visa DAF (Digital Authentication Framework) for this authentication.",
      ),
    exemption_type: z
      .enum(["low_value", "transaction_risk_analysis_exemption"])
      .optional()
      .describe(
        "Exemption type to request in order to reduce challenge likelihood. `low_value` or `transaction_risk_analysis_exemption`.",
      ),
    acquiring_bank_fraud_rate: z
      .string()
      .optional()
      .describe(
        "Required when `exemption_type` is `transaction_risk_analysis_exemption`. The acquiring bank's fraud rate threshold.",
      ),
    three_ds_requestor_challenge_ind: z
      .string()
      .optional()
      .describe(
        "Indicates whether a challenge is being requested for this 3DS2 transaction. Refer to the EMV 3DS spec for valid values.",
      ),
  })
  .strict();

export const CreateScaProviderSchema = z
  .object({
    merchant_profile_key: z
      .string()
      .describe("Token of the Merchant Profile to associate this SCA Provider with"),
    type: z
      .literal("spreedly")
      .describe(
        "Type of SCA Provider. Currently only `spreedly` is supported (case sensitive).",
      ),
    sandbox: z
      .boolean()
      .optional()
      .describe(
        "When `true`, provisions the SCA Provider in sandbox mode. Defaults to `false`.",
      ),
    visa: ScaVisaDetailsSchema.optional().describe(
      "Visa card-network registration. Required if Visa transactions should use this SCA Provider.",
    ),
    mastercard: ScaCardDetailsSchema.optional().describe(
      "Mastercard card-network registration.",
    ),
    amex: ScaCardDetailsSchema.optional().describe(
      "American Express card-network registration.",
    ),
    discover: ScaCardDetailsSchema.optional().describe(
      "Discover card-network registration.",
    ),
  })
  .describe(
    "SCA Provider configuration. `merchant_profile_key` and `type` are required. At least one card-network object must be provided.",
  )
  .strict();

export const ShowScaProviderSchema = z
  .object({
    sca_provider_token: z.string().describe("The token of the SCA provider"),
  })
  .strict();