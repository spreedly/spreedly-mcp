/**
 * Reusable mock responders for eval scenarios.
 *
 * Gateway operations (authorize, purchase, etc.) extract gateway_token from
 * the URL path and echo transaction params from the request body.
 *
 * Transaction follow-ups (capture, void, credit) extract transaction_token
 * from the URL path. Body params (amount, currency_code) override defaults
 * when present.
 */

import type { MockResponseFn, MockResponseEntry } from "../../tests/helpers/transport.js";
import { fakeTransaction, fakeGateway } from "../../tests/helpers/fixtures.js";

type Overrides = Record<string, unknown>;

function extractGatewayToken(path: string): string {
  return path.split("/")[2] ?? "unknown";
}

function extractTransactionBody(options?: { body?: unknown }): Record<string, unknown> {
  const body = options?.body as { transaction?: Record<string, unknown> } | undefined;
  return body?.transaction ?? {};
}

function gatewayOp(transactionType: string, overrides: Overrides = {}): MockResponseFn {
  return (_method, path, options) => {
    const txn = extractTransactionBody(options);
    return {
      data: fakeTransaction({
        transaction_type: transactionType,
        gateway_token: extractGatewayToken(path),
        ...(txn.payment_method_token !== undefined && {
          payment_method_token: txn.payment_method_token,
        }),
        ...(txn.amount !== undefined && { amount: txn.amount }),
        ...(txn.currency_code !== undefined && { currency_code: txn.currency_code }),
        ...overrides,
      }),
    };
  };
}

function transactionOp(transactionType: string, defaults: Overrides = {}): MockResponseFn {
  return (_method, path, options) => {
    const txn = extractTransactionBody(options);
    const txnToken = path.split("/")[2] ?? "unknown";
    return {
      data: fakeTransaction({
        transaction_type: transactionType,
        token: txnToken,
        ...defaults,
        ...(txn.amount !== undefined ? { amount: txn.amount } : {}),
        ...(txn.currency_code !== undefined ? { currency_code: txn.currency_code } : {}),
      }),
    };
  };
}

// ---------------------------------------------------------------------------
// Successful echo responders
//
// Each helper returns a MockResponseFn (a function). Use them directly as
// mockResponses map values — do NOT wrap in { data: ... }:
//
//   CORRECT:  ["POST /gateways/*/purchase.json", echo.purchase()]
//   WRONG:    ["POST /gateways/*/purchase.json", { data: echo.purchase() }]
// ---------------------------------------------------------------------------

export const echo = {
  authorize: (overrides?: Overrides): MockResponseFn => gatewayOp("Authorization", overrides),
  purchase: (overrides?: Overrides): MockResponseFn => gatewayOp("Purchase", overrides),
  verify: (overrides?: Overrides): MockResponseFn => gatewayOp("Verification", overrides),
  store: (overrides?: Overrides): MockResponseFn => gatewayOp("Store", overrides),
  generalCredit: (overrides?: Overrides): MockResponseFn => gatewayOp("Credit", overrides),
  capture: (defaults?: Overrides): MockResponseFn => transactionOp("Capture", defaults),
  void: (defaults?: Overrides): MockResponseFn => transactionOp("Void", defaults),
  credit: (defaults?: Overrides): MockResponseFn => transactionOp("Credit", defaults),
};

// ---------------------------------------------------------------------------
// Failure responders
// ---------------------------------------------------------------------------

export const fail = {
  authorize: (overrides?: Overrides): MockResponseFn =>
    gatewayOp("Authorization", {
      state: "gateway_processing_failed",
      succeeded: false,
      message: "Unable to process the authorization.",
      ...overrides,
    }),
  purchase: (overrides?: Overrides): MockResponseFn =>
    gatewayOp("Purchase", {
      state: "gateway_processing_failed",
      succeeded: false,
      message: "Unable to process the purchase.",
      ...overrides,
    }),
  decline: (overrides?: Overrides): MockResponseFn =>
    gatewayOp("Purchase", {
      state: "declined",
      succeeded: false,
      message: "Transaction declined by the payment processor.",
      ...overrides,
    }),
};

// ---------------------------------------------------------------------------
// Convenience helpers for static mock entries
// ---------------------------------------------------------------------------

export function gatewayList(
  ...gateways: Array<{ token: string; gateway_type: string; name: string }>
): MockResponseEntry {
  return {
    data: {
      gateways: gateways.map((g) => fakeGateway(g).gateway),
    },
  };
}

export function gatewayCreate(overrides: Overrides = {}): MockResponseEntry {
  return { data: fakeGateway(overrides) };
}

/**
 * Routes to different mock responders based on the gateway_token in the URL.
 * Falls back to `fallback` for unmatched gateways.
 */
export function byGateway(
  handlers: Record<string, MockResponseFn>,
  fallback?: MockResponseFn,
): MockResponseFn {
  return (method, path, options) => {
    const gatewayToken = extractGatewayToken(path);
    const handler = handlers[gatewayToken] ?? fallback;
    if (!handler) throw new Error(`No mock handler for gateway ${gatewayToken}`);
    return handler(method, path, options);
  };
}
