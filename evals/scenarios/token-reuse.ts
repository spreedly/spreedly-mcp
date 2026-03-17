import type { Scenario } from "../lib/types.js";
import type { MockResponseValue } from "../../tests/helpers/transport.js";
import { GW, PM, TXN } from "../lib/mockTokens.js";
import {
  toolCalled,
  toolCalledWith,
  toolNotCalled,
  argumentDiffersAcrossCalls,
  argumentSameAcrossCalls,
  callOrder,
} from "../lib/graders.js";
import { echo, gatewayList } from "../lib/mock-responders.js";

export const noReusePaymentMethodAcrossCustomers: Scenario = {
  name: "Do not reuse payment_method_token across customers",
  description:
    "When processing transactions for different customers, the AI must use the correct payment_method_token for each.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map<string, MockResponseValue>([
    [
      "GET /gateways.json",
      gatewayList({ token: GW.STRIPE_US, gateway_type: "stripe", name: "Stripe US" }),
    ],
    ["POST /gateways/*/authorize.json", echo.authorize()],
  ]),

  messages: [
    {
      role: "user",
      content: `Authorize $10 on Alice's card (payment method token: ${PM.ALICE_VISA}), then authorize $20 on Bob's card (payment method token: ${PM.BOB_MC}). Use the Stripe US gateway (gateway token: ${GW.STRIPE_US}) for both.`,
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_authorize", { times: 2 }),
    toolNotCalled("spreedly_gateway_create"),
    argumentDiffersAcrossCalls("spreedly_gateway_authorize", "payment_method_token"),
    argumentSameAcrossCalls("spreedly_gateway_authorize", "gateway_token"),
  ],
};

export const reuseGatewayTokenForSameProcessor: Scenario = {
  name: "Reuse gateway_token for same processor across transactions",
  description:
    "Multiple transactions routed to the same processor should reuse the same gateway token.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map<string, MockResponseValue>([
    [
      "GET /gateways.json",
      gatewayList({ token: GW.STRIPE_US, gateway_type: "stripe", name: "Stripe US" }),
    ],
    ["POST /gateways/*/purchase.json", echo.purchase()],
  ]),

  messages: [
    {
      role: "user",
      content: `Process two purchases through the Stripe US gateway (gateway token: ${GW.STRIPE_US}): $15 on ${PM.CUSTOMER_A} and $25 on ${PM.CUSTOMER_B}. Both in USD.`,
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_purchase", { times: 2 }),
    toolNotCalled("spreedly_gateway_create"),
    argumentSameAcrossCalls("spreedly_gateway_purchase", "gateway_token"),
    argumentDiffersAcrossCalls("spreedly_gateway_purchase", "payment_method_token"),
  ],
};

export const authorizeThenCapture: Scenario = {
  name: "Authorize then capture uses transaction_token from response",
  description:
    "After authorizing, the AI must use the transaction_token from the authorize response to capture.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map<string, MockResponseValue>([
    ["POST /gateways/*/authorize.json", echo.authorize({ token: TXN.AUTH_THEN_CAPTURE })],
    ["POST /transactions/*/capture.json", echo.capture({ amount: 5000, currency_code: "USD" })],
  ]),

  messages: [
    {
      role: "user",
      content: `Authorize $50 USD on payment method ${PM.ALICE_VISA} using gateway ${GW.STRIPE_US}, then capture the authorization.`,
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_authorize", { times: 1 }),
    toolCalled("spreedly_transaction_capture", { times: 1 }),
    toolCalledWith("spreedly_transaction_capture", { transaction_token: TXN.AUTH_THEN_CAPTURE }),
    callOrder("spreedly_gateway_authorize", "spreedly_transaction_capture"),
    toolNotCalled("spreedly_gateway_create"),
  ],
};

export const tokenReuseScenarios: Scenario[] = [
  noReusePaymentMethodAcrossCustomers,
  reuseGatewayTokenForSameProcessor,
  authorizeThenCapture,
];
