import type { Scenario } from "../lib/types.js";
import type { MockResponseValue } from "../../tests/helpers/transport.js";
import {
  toolCalled,
  toolCalledWith,
  toolNotCalled,
  maxCalls,
  callOrder,
  argumentSameAcrossCalls,
  pausedForInput,
} from "../lib/graders.js";
import { echo, gatewayList, gatewayCreate } from "../lib/mock-responders.js";
import { GW, PM } from "../lib/mockTokens.js";
import {
  fakeGateway,
  fakeGatewayOptions,
  fakePaymentMethod,
} from "../../tests/helpers/fixtures.js";

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
      gatewayList({
        token: GW.EXISTING_STRIPE,
        gateway_type: "stripe",
        name: "Stripe Production",
      }),
    ],
    [
      "POST /gateways.json",
      gatewayCreate({ token: GW.NEW_STRIPE, gateway_type: "stripe", name: "Stripe New" }),
    ],
    ["POST /gateways/*/purchase.json", echo.purchase()],
  ]),

  messages: [
    {
      role: "user",
      content: `Process a $50 USD purchase on payment method ${PM.CUSTOMER_A} using a Stripe gateway.`,
    },
  ],

  graders: [
    toolCalled("spreedly_gateway_list"),
    toolNotCalled("spreedly_gateway_create"),
    toolCalled("spreedly_gateway_purchase"),
    toolCalledWith("spreedly_gateway_purchase", { gateway_token: GW.EXISTING_STRIPE }),
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
      gatewayList({ token: GW.STRIPE, gateway_type: "stripe", name: "Stripe" }),
    ],
    [
      "GET /gateways/*.json",
      {
        data: fakeGateway({ token: GW.STRIPE, gateway_type: "stripe", name: "Stripe" }),
      },
    ],
    [
      "GET /payment_methods.json",
      {
        data: {
          payment_methods: [
            fakePaymentMethod({ token: PM.BATCH_1 }).payment_method,
            fakePaymentMethod({ token: PM.BATCH_2 }).payment_method,
            fakePaymentMethod({ token: PM.BATCH_3 }).payment_method,
          ],
        },
      },
    ],
    ["POST /gateways.json", gatewayCreate({ token: GW.NEW })],
    ["POST /gateways/*/purchase.json", echo.purchase()],
  ]),

  messages: [
    {
      role: "user",
      content: `Process 3 purchases through a Stripe gateway: $10 on payment method ${PM.BATCH_1}, $20 on payment method ${PM.BATCH_2}, and $30 on payment method ${PM.BATCH_3}. All USD.`,
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
    ["GET /gateways_options.json", { data: fakeGatewayOptions() }],
    [
      "GET /gateways.json",
      gatewayList({
        token: GW.STRIPE_SANDBOX,
        gateway_type: "stripe",
        name: "Stripe Sandbox",
      }),
    ],
    ["POST /gateways.json", gatewayCreate({ token: GW.NEW_STRIPE, gateway_type: "stripe" })],
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
    ["GET /gateways_options.json", { data: fakeGatewayOptions() }],
    [
      "GET /gateways.json",
      gatewayList(
        { token: GW.STRIPE_SANDBOX, gateway_type: "stripe", name: "Stripe Sandbox" },
        { token: GW.STRIPE_PRODUCTION, gateway_type: "stripe", name: "Stripe Production" },
      ),
    ],
    ["POST /gateways.json", gatewayCreate({ token: GW.NEW_STRIPE, gateway_type: "stripe" })],
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
