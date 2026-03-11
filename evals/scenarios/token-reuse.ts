import type { Scenario } from "../lib/types.js";
import type { MockResponseFn, MockResponseValue } from "../../tests/helpers/transport.js";
import {
  toolCalled,
  toolCalledWith,
  toolNotCalled,
  argumentDiffersAcrossCalls,
  argumentSameAcrossCalls,
  callOrder,
} from "../lib/graders.js";
import { fakeGateway, fakeTransaction } from "../../tests/helpers/fixtures.js";

const echoAuthorize: MockResponseFn = (_method, path, options) => {
  const body = options?.body as { transaction?: Record<string, unknown> } | undefined;
  const txn = body?.transaction ?? {};
  const gatewayToken = path.split("/")[2] ?? "unknown";
  return {
    data: fakeTransaction({
      transaction_type: "Authorization",
      gateway_token: gatewayToken,
      payment_method_token: txn.payment_method_token,
      amount: txn.amount,
      currency_code: txn.currency_code,
    }),
  };
};

const echoPurchase: MockResponseFn = (_method, path, options) => {
  const body = options?.body as { transaction?: Record<string, unknown> } | undefined;
  const txn = body?.transaction ?? {};
  const gatewayToken = path.split("/")[2] ?? "unknown";
  return {
    data: fakeTransaction({
      transaction_type: "Purchase",
      gateway_token: gatewayToken,
      payment_method_token: txn.payment_method_token,
      amount: txn.amount,
      currency_code: txn.currency_code,
    }),
  };
};

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
      {
        data: {
          gateways: [
            fakeGateway({
              token: "GW_stripe_us",
              gateway_type: "stripe",
              name: "Stripe US",
            }).gateway,
          ],
        },
      },
    ],
    ["POST /gateways/*/authorize.json", echoAuthorize],
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
      {
        data: {
          gateways: [
            fakeGateway({
              token: "GW_stripe_us",
              gateway_type: "stripe",
              name: "Stripe US",
            }).gateway,
          ],
        },
      },
    ],
    ["POST /gateways/*/purchase.json", echoPurchase],
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

  mockResponses: new Map<string, import("../../tests/helpers/transport.js").MockResponseValue>([
    [
      "POST /gateways/*/authorize.json",
      (_method, path, options) => {
        const body = options?.body as { transaction?: Record<string, unknown> } | undefined;
        const txn = body?.transaction ?? {};
        const gatewayToken = path.split("/")[2] ?? "unknown";
        return {
          data: fakeTransaction({
            token: "TXN_auth_001",
            transaction_type: "Authorization",
            gateway_token: gatewayToken,
            payment_method_token: txn.payment_method_token,
            amount: txn.amount,
            currency_code: txn.currency_code,
          }),
        };
      },
    ],
    [
      "POST /transactions/*/capture.json",
      {
        data: fakeTransaction({
          token: "TXN_auth_001",
          transaction_type: "Capture",
        }),
      },
    ],
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
