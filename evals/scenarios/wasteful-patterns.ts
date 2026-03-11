import type { Scenario } from "../lib/types.js";
import type { MockResponseFn, MockResponseValue } from "../../tests/helpers/transport.js";
import {
  toolCalled,
  toolCalledWith,
  toolNotCalled,
  maxCalls,
  callOrder,
  argumentSameAcrossCalls,
  pausedForInput,
} from "../lib/graders.js";
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
    toolCalledWith("spreedly_gateway_purchase", { gateway_token: "GW_existing_stripe" }),
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
    argumentSameAcrossCalls("spreedly_gateway_purchase", "gateway_token"),
    maxCalls("spreedly_gateway_create", 0),
    maxCalls("spreedly_gateway_list", 1),
  ],
};

export const findExistingSandboxGateway: Scenario = {
  name: "Find existing sandbox gateway instead of creating one",
  description:
    "When asked to get a gateway token for sandbox testing, the AI should list existing gateways and return the matching one.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: false,
    administrativeEnabled: true,
  },

  mockResponses: new Map<string, MockResponseValue>([
    [
      "GET /gateways.json",
      {
        data: {
          gateways: [
            fakeGateway({
              token: "GW_stripe_sandbox",
              gateway_type: "stripe",
              name: "Stripe Sandbox",
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
      content:
        "I need to make a test transaction on Stripe in sandbox mode. Please get me a gateway token to use.",
    },
  ],

  graders: [toolCalled("spreedly_gateway_list"), toolNotCalled("spreedly_gateway_create")],
};

export const clarifyAmbiguousGateway: Scenario = {
  name: "Clarify when both sandbox and production gateways exist",
  description:
    "When multiple gateways of the same type exist (sandbox + production), the AI should list them and ask which one to use rather than picking one.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: false,
    administrativeEnabled: true,
  },

  mockResponses: new Map<string, MockResponseValue>([
    [
      "GET /gateways.json",
      {
        data: {
          gateways: [
            fakeGateway({
              token: "GW_stripe_sandbox",
              gateway_type: "stripe",
              name: "Stripe Sandbox",
            }).gateway,
            fakeGateway({
              token: "GW_stripe_production",
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
      content: "I need to run a transaction on Stripe. Please get me a gateway token to use.",
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_list"),
    toolNotCalled("spreedly_gateway_create"),
    pausedForInput(),
  ],
};

export const wastefulPatternScenarios: Scenario[] = [
  listBeforeCreateGateway,
  noRepeatedGatewayCreation,
  findExistingSandboxGateway,
  clarifyAmbiguousGateway,
];
