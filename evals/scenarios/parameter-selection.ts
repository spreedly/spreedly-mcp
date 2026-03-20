import type { Scenario } from "../lib/types.js";
import { GW, PM, TXN } from "../lib/mockTokens.js";
import { toolCalled, toolCalledWith, toolNotCalled } from "../lib/graders.js";
import { echo } from "../lib/mock-responders.js";

export const dollarToCentsConversion: Scenario = {
  name: "Converts dollar amount to cents",
  description: "When the user says '$50.00', the AI must send amount=5000 (cents) to the API.",
  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map([
    [
      "POST /gateways/*/purchase.json",
      echo.purchase({
        gateway_token: GW.GENERIC,
        payment_method_token: PM.ALICE_VISA,
        amount: 5000,
        currency_code: "USD",
      }),
    ],
  ]),

  messages: [
    {
      role: "user",
      content: `Charge $50.00 USD to payment method ${PM.ALICE_VISA} on gateway ${GW.GENERIC}.`,
    },
  ],
  graders: [
    toolCalled("spreedly_gateway_purchase", { times: 1 }),
    toolCalledWith("spreedly_gateway_purchase", {
      gateway_token: GW.GENERIC,
      payment_method_token: PM.ALICE_VISA,
      amount: 5000,
      currency_code: "USD",
    }),
  ],
};

export const currencyHandlingforJPY: Scenario = {
  name: "JPY amount has no decimal subdivision",
  description: "1000 JPY must be sent as amount=1000, not 100000. JPY has no fractional units.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map([
    ["POST /gateways/*/purchase.json", echo.purchase({ amount: 5000, currency_code: "USD" })],
  ]),

  messages: [
    {
      role: "user",
      content: `Charge 1000 JPY to ${PM.CUSTOMER_A} on gateway ${GW.GENERIC}. Note: JPY has no decimal subdivision, so 1000 JPY is 1000 units.`,
    },
  ],
  graders: [toolCalledWith("spreedly_gateway_purchase", { amount: 1000, currency_code: "JPY" })],
};

export const useRetainFlagOnPurchaseToSaveCardDataForFutureUse: Scenario = {
  name: "Retain on success during purchase",
  description:
    "When asked to save the card only if the charge succeeds, the AI must use retain_on_success=true on purchase.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map([
    [
      "POST /gateways/*/purchase.json",
      echo.purchase({
        amount: 1000,
        currency_code: "USD",
        retain_on_success: true,
      }),
    ],
  ]),

  messages: [
    {
      role: "user",
      content: `Charge $10.00 USD to ${PM.FRESH_CARD} on gateway ${GW.GENERIC}. If the charge succeeds, save the card for future use.`,
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_purchase", { times: 1 }),
    toolCalledWith("spreedly_gateway_purchase", { retain_on_success: true, amount: 1000 }),
    toolNotCalled("spreedly_payment_method_retain"),
  ],
};

export const useAmountParamForPartialCapture: Scenario = {
  name: "Partial capture preserves authorization token and uses correct amount",
  description:
    "When capturing less than the authorized amount, the AI must pass the partial amount and correct transaction token.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map([["POST /transactions/*/capture.json", echo.capture({ amount: 6000 })]]),

  messages: [
    {
      role: "user",
      content: `We authorized $100.00 USD on gateway ${GW.GENERIC} with ${PM.CUSTOMER_A}. The authorization token is ${TXN.AUTH_PARTIAL_CAPTURE}. Only $60.00 worth of items are ready to ship. Capture just $60.00.`,
    },
  ],

  graders: [
    toolCalled("spreedly_transaction_capture", { times: 1 }),
    toolCalledWith("spreedly_transaction_capture", {
      transaction_token: TXN.AUTH_PARTIAL_CAPTURE,
      amount: 6000,
    }),
  ],
};

export const parameterSelection: Scenario[] = [
  dollarToCentsConversion,
  currencyHandlingforJPY,
  useRetainFlagOnPurchaseToSaveCardDataForFutureUse,
  useAmountParamForPartialCapture,
];
