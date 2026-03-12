import type { Scenario } from "../lib/types.js";
import type { MockResponseFn, MockResponseValue } from "../../tests/helpers/transport.js";
import { toolCalled, toolCalledWith, toolNotCalled } from "../lib/graders.js";
import { fakeTransaction } from "../../tests/helpers/fixtures.js";

// Evals here focus on agent tool choice (credit vs void), not on amount/schema behavior
// which is already covered by unit tests in tests/domains/transactions.test.ts.

const echoCredit: MockResponseFn = (_method, path, options) => {
  const body = options?.body as { transaction?: Record<string, unknown> } | undefined;
  const txn = body?.transaction ?? {};
  const transactionToken = path.split("/")[2] ?? "unknown";
  return {
    data: fakeTransaction({
      token: transactionToken,
      transaction_type: "Credit",
      amount: txn.amount,
    }),
  };
};

/** Refund must use credit, not void. Unit tests already verify credit/void handlers. */
export const fullRefundAfterPurchase: Scenario = {
  name: "Full refund uses credit (not void)",
  description:
    "For a refund the agent must call spreedly_transaction_credit; must not use void.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map<string, MockResponseValue>([
    ["POST /transactions/*/credit.json", echoCredit],
  ]),

  messages: [
    {
      role: "user",
      content:
        "A customer wants a full refund for transaction TXN_purchase_001. Process the refund.",
    },
  ],

  graders: [
    toolCalled("spreedly_transaction_credit", { times: 1 }),
    toolNotCalled("spreedly_transaction_void"),
    toolCalledWith("spreedly_transaction_credit", { transaction_token: "TXN_purchase_001" }),
  ],
};

/** Cancel uncaptured auth must use void, not credit. */
export const voidBeforeCapture: Scenario = {
  name: "Cancel uncaptured authorization uses void (not credit)",
  description:
    "For an authorization that has not been captured, the agent must call spreedly_transaction_void to release the hold; must not use credit.",

  policy: {
    paymentMethodTokenizationEnabled: false,
    transactionInitiationEnabled: true,
    administrativeEnabled: false,
  },

  mockResponses: new Map<string, MockResponseValue>([
    [
      "POST /transactions/*/void.json",
      {
        data: fakeTransaction({
          token: "TXN_auth_hold",
          transaction_type: "Void",
          state: "succeeded",
          succeeded: true,
        }),
      },
    ],
  ]),

  messages: [
    {
      role: "user",
      content:
        "The customer just called and wants to cancel their order. The authorization transaction is TXN_auth_hold. It has not been captured yet. Cancel it.",
    },
  ],

  graders: [
    toolCalled("spreedly_transaction_void", { times: 1 }),
    toolCalledWith("spreedly_transaction_void", { transaction_token: "TXN_auth_hold" }),
    toolNotCalled("spreedly_transaction_credit"),
  ],
};

export const paymentLifecycleScenarios: Scenario[] = [
  fullRefundAfterPurchase,
  voidBeforeCapture,
];
