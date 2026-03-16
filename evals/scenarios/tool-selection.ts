import type { Scenario } from "../lib/types.js";
import type { MockResponseValue } from "../../tests/helpers/transport.js";
import { toolCalled, toolCalledWith, toolNotCalled } from "../lib/graders.js";
import { echo, gatewayList } from "../lib/mock-responders.js";

export const useVoidInsteadOfCreditForUncapturedAuthorization: Scenario = {
  name: "Void uncaptured authorization instead of credit",
  description: "When canceling an uncaptured authorization, the AI must use void, not credit.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },
  mockResponses: new Map([
    ["POST /transactions/*/void.json", { data: echo.void({ token: "AUTH_TXN_001" }) }],
  ]),
  messages: [
    {
      role: "user",
      content:
        "The customer wants to cancel their pending order. The authorization transaction is AUTH_TXN_001. It has NOT been captured yet. Cancel it.",
    },
  ],

  graders: [
    toolCalled("spreedly_transaction_void"),
    toolNotCalled("spreedly_transaction_credit"),
    toolCalledWith("spreedly_transaction_void", { transaction_token: "AUTH_TXN_001" }),
  ],
};

export const useCreditInsteadOfVoidForRefundOfPurchase: Scenario = {
  name: "Credit captured purchase for refund",
  description: "When refunding a completed purchase, the AI must use credit, not void.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map([
    ["POST /transactions/*/credit.json", { data: echo.credit({ token: "AUTH_TXN_001" }) }],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Customer wants a full refund for their completed purchase. Transaction token: TXN_purchase_001. Process the refund.",
    },
  ],
  graders: [
    toolCalled("spreedly_transaction_credit"),
    toolNotCalled("spreedly_transaction_void"),
    toolCalledWith("spreedly_transaction_credit", { transaction_token: "TXN_purchase_001" }),
  ],
};

export const useVerifyToValidate: Scenario = {
  name: "Verify card does not authorize or charge",
  description:
    "When asked to validate a card without charging, the AI must use verify, not authorize or purchase.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map<string, MockResponseValue>([
    ["GET /gateways.json", gatewayList({ token: "GW_test", gateway_type: "test", name: "Test" })],
    ["POST /gateways/*/verify.json", echo.verify()],
  ]),

  messages: [
    {
      role: "user",
      content:
        "A customer just added their card. Verify it is valid without charging anything. Gateway: GW_test payment method: PM_new_card Currency: USD",
    },
  ],

  graders: [
    toolNotCalled("spreedly_gateway_authorize"),
    toolNotCalled("spreedly_gateway_purchase"),
    toolCalledWith("spreedly_gateway_verify", {
      gateway_token: "GW_test",
      payment_method_token: "PM_new_card",
      currency_code: "USD",
    }),
  ],
};

export const useGeneralCreditInsteadOfRefundOnGoodwillCredit: Scenario = {
  name: "General credit is not a transaction refund",
  description:
    "When issuing a standalone goodwill credit (not tied to a prior transaction), the AI must use gateway_general_credit, not transaction_credit.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map<string, MockResponseValue>([
    ["GET /gateways.json", gatewayList({ token: "GW_test", gateway_type: "test", name: "Test" })],
    ["POST /gateways/*/general_credit.json", echo.generalCredit({ amount: 2500 })],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Issue a $25.00 USD goodwill credit to payment method PM_customer_a on gateway GW_test. This is NOT a refund for any previous transaction -- it's a standalone credit.",
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_general_credit"),
    toolNotCalled("spreedly_transaction_credit"),
    toolCalledWith("spreedly_gateway_general_credit", { amount: 2500, currency_code: "USD" }),
  ],
};

export const toolSelectionScenarios: Scenario[] = [
  useCreditInsteadOfVoidForRefundOfPurchase,
  useVoidInsteadOfCreditForUncapturedAuthorization,
  useVerifyToValidate,
  useGeneralCreditInsteadOfRefundOnGoodwillCredit,
];
