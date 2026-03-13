import type { Scenario } from "../lib/types.js";
import type { MockResponseValue } from "../../tests/helpers/transport.js";
import {
  toolCalled,
  toolCalledWith,
  callOrder
} from "../lib/graders.js";
import { echo } from "../lib/mock-responders.js";


// const purchaseFollowedByPaymentMethodCreation: Scenario = {

//   name: "Tokenize card then purchase carries payment method token",
//   description: "When tokenizing a new card and then charging it, the AI must use the PM token from the create response.",
  
//   policy: { 
//     paymentMethodTokenizationEnabled: true, 
//     transactionInitiationEnabled: true, 
//     administrativeEnabled: false 
//   },

//   mockResponses: new Map<string, MockResponseValue>([
//       ["POST /payment_methods.json", { data: { transaction: { payment_method: { token: "PM_jane_new" } } } }],
//       ["POST /gateways/*/purchase.json", echo.purchase()]
//     ]),

//   messages: [
//     {
//       role: "user",
//       content: "New customer Jane Doe, Visa 4111111111111111, exp 06/2027, CVV 456. Tokenize this card, then charge $25.00 USD on gateway GW_test."
//     }
//   ],

//   graders: [
//     toolCalled("spreedly_payment_method_create", { times: 1 }),
//     toolCalled("spreedly_gateway_purchase", { times: 1 }),
//     callOrder("spreedly_payment_method_create", "spreedly_gateway_purchase"),
//     toolCalledWith("spreedly_gateway_purchase", { payment_method_token: "PM_jane_new", amount: 2500 })
//   ]
// };

const purchaseFollowedByRecache: Scenario = {
  name: "Recache CVV before purchase",
  description: "When told to recache CVV and then charge, the AI must sequence recache before purchase.",
  
  policy: { 
    paymentMethodTokenizationEnabled: true, 
    transactionInitiationEnabled: true, 
    administrativeEnabled: false 
  },

    mockResponses: new Map<string, MockResponseValue>([
      [
        "POST /payment_methods/*/recache.json", 
        { 
          data: { 
            payment_method: { token: "PM_returning" } 
          } 
        }
      ],
      [
        "POST /gateways/*/purchase.json", echo.purchase()
      ]
    ]),

  messages: [
    {
      role: "user", 
      content: "Returning customer needs CVV recached. Recache CVV '321' for payment method PM_returning, then charge $15.00 USD on gateway GW_test." 
    }
  ],

  graders: [
    toolCalled("spreedly_payment_method_recache", { times: 1 }),
    toolCalled("spreedly_gateway_purchase", { times: 1 }),
    callOrder("spreedly_payment_method_recache", "spreedly_gateway_purchase"),
    toolCalledWith("spreedly_gateway_purchase", { amount: 1500 })
  ]

};


export const multiStepWorkflows: Scenario[] = [
  purchaseFollowedByRecache,
]