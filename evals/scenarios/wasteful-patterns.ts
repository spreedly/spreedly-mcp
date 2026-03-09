import type { Scenario } from "../lib/types.js";
import type { MockResponseFn, MockResponseValue } from "../../tests/helpers/transport.js";
import { toolCalled, toolNotCalled, maxCalls, callOrder } from "../lib/graders.js";
import { fakeGateway, fakeTransaction } from "../../tests/helpers/fixtures.js";

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

export const listBeforeCreateGateway: Scenario = {
  name: "List gateways before creating when one exists",
  description:
    "When asked to process a payment and gateways exist, the AI should list them rather than creating new ones.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: true,
  },

  mockResponses: new Map<string, MockResponseValue>([
    [
      "GET /gateways.json",
      {
        data: {
          gateways: [
            fakeGateway({
              token: "GW_existing_stripe",
              gateway_type: "stripe",
              name: "Stripe Production",
            }).gateway,
          ],
        },
      },
    ],
    [
      "POST /gateways.json",
      {
        data: fakeGateway({
          token: "GW_new_stripe",
          gateway_type: "stripe",
          name: "Stripe New",
        }),
      },
    ],
    ["POST /gateways/*/purchase.json", echoPurchase],
  ]),

  messages: [
    {
      role: "user",
      content: "Process a $50 USD purchase on PM_customer_a using a Stripe gateway.",
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_list"),
    toolNotCalled("spreedly_gateway_create"),
    toolCalled("spreedly_gateway_purchase"),
    callOrder("spreedly_gateway_list", "spreedly_gateway_purchase"),
  ],
};

export const noRepeatedGatewayCreation: Scenario = {
  name: "Do not create a gateway for every transaction",
  description: "Processing 3 sequential transactions should not result in 3 gateway_create calls.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: true,
  },

  mockResponses: new Map<string, MockResponseValue>([
    [
      "GET /gateways.json",
      {
        data: {
          gateways: [
            fakeGateway({
              token: "GW_stripe",
              gateway_type: "stripe",
              name: "Stripe",
            }).gateway,
          ],
        },
      },
    ],
    ["POST /gateways.json", { data: fakeGateway({ token: "GW_new" }) }],
    ["POST /gateways/*/purchase.json", echoPurchase],
  ]),

  messages: [
    {
      role: "user",
      content:
        "Process 3 purchases through a Stripe gateway: $10 on PM_a, $20 on PM_b, and $30 on PM_c. All USD.",
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_purchase", { times: 3 }),
    maxCalls("spreedly_gateway_create", 0),
    maxCalls("spreedly_gateway_list", 1),
  ],
};

export const checkExistingBeforeCreate: Scenario = {
  name: "Check for existing Stripe gateway before creating one",
  description:
    "When asked to create a Stripe gateway but one already exists, the AI should list first and avoid creating.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: false,
    administrativeEnabled: true,
  },

  mockResponses: new Map([
    [
      "GET /gateways.json",
      {
        data: {
          gateways: [
            fakeGateway({
              token: "GW_existing_stripe",
              gateway_type: "stripe",
              name: "Stripe Production",
            }).gateway,
          ],
        },
      },
    ],
    [
      "POST /gateways.json",
      { data: fakeGateway({ token: "GW_new_stripe", gateway_type: "stripe" }) },
    ],
  ]),

  messages: [
    {
      role: "user",
      content: "Create a Stripe gateway for me.",
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_list"),
    callOrder("spreedly_gateway_list", "spreedly_gateway_create"),
  ],
};

export const wastefulPatternScenarios: Scenario[] = [
  listBeforeCreateGateway,
  noRepeatedGatewayCreation,
  checkExistingBeforeCreate,
];
