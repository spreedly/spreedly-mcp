import type { Scenario } from "../lib/types.js";
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
      {
        data: echo.purchase({
          gateway_token: "GW_test",
          payment_method_token: "PM_alice_visa",
          amount: 5000,
          currency_code: "USD",
        }),
      },
    ],
  ]),

  messages: [
    {
      role: "user",
      content: "Charge $50.00 USD to payment method PM_alice_visa on gateway GW_test.",
    },
  ],
  graders: [
    toolCalled("spreedly_gateway_purchase", { times: 1 }),
    toolCalledWith("spreedly_gateway_purchase", {
      gateway_token: "GW_test",
      payment_method_token: "PM_alice_visa",
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
    [
      "POST /gateways/*/purchase.json",
      {
        data: echo.purchase({ amount: 5000, currency_code: "USD" }),
      },
    ],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Charge 1000 JPY to PM_customer_a on gateway GW_test. Note: JPY has no decimal subdivision, so 1000 JPY is 1000 units.",
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
      {
        data: echo.purchase({
          amount: 1000,
          currency_code: "USD",
          retain_on_success: true,
        }),
      },
    ],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Charge $10.00 USD to PM_fresh_card on gateway GW_test. If the charge succeeds, save the card for future use.",
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

  mockResponses: new Map([
    ["POST /transactions/*/capture.json", { data: echo.capture({ amount: 6000 }) }],
  ]),

  messages: [
    {
      role: "user",
      content:
        "We authorized $100.00 USD on gateway GW_test with PM_customer_a. The authorization token is AUTH_TXN_100. Only $60.00 worth of items are ready to ship. Capture just $60.00.",
    },
  ],

  graders: [
    toolCalled("spreedly_transaction_capture", { times: 1 }),
    toolCalledWith("spreedly_transaction_capture", {
      transaction_token: "AUTH_TXN_100",
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
