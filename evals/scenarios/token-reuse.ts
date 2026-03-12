import type { Scenario } from "../lib/types.js";
import type { MockResponseValue } from "../../tests/helpers/transport.js";
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
      gatewayList({ token: "GW_stripe_us", gateway_type: "stripe", name: "Stripe US" }),
    ],
    ["POST /gateways/*/authorize.json", echo.authorize()],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Authorize $10 on Alice's card (payment method token: PM_alice_visa), then authorize $20 on Bob's card (payment method token: PM_bob_mc). Use the Stripe US gateway (gateway token: GW_stripe_us) for both.",
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
      gatewayList({ token: "GW_stripe_us", gateway_type: "stripe", name: "Stripe US" }),
    ],
    ["POST /gateways/*/purchase.json", echo.purchase()],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Process two purchases through the Stripe US gateway (gateway token: GW_stripe_us): $15 on PM_customer_a and $25 on PM_customer_b. Both in USD.",
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
    ["POST /gateways/*/authorize.json", echo.authorize({ token: "TXN_auth_001" })],
    ["POST /transactions/*/capture.json", echo.capture({ amount: 5000, currency_code: "USD" })],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Authorize $50 USD on payment method PM_alice_visa using gateway GW_stripe_us, then capture the authorization.",
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_authorize", { times: 1 }),
    toolCalled("spreedly_transaction_capture", { times: 1 }),
    toolCalledWith("spreedly_transaction_capture", { transaction_token: "TXN_auth_001" }),
    callOrder("spreedly_gateway_authorize", "spreedly_transaction_capture"),
    toolNotCalled("spreedly_gateway_create"),
  ],
};

export const tokenReuseScenarios: Scenario[] = [
  noReusePaymentMethodAcrossCustomers,
  reuseGatewayTokenForSameProcessor,
  authorizeThenCapture,
];
