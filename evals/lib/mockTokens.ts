/**
 * Simulated Spreedly tokens for eval scenarios.
 *
 * Values are realistic-looking alphanumeric strings so the LLM under test
 * treats them as real tokens rather than questioning their validity.
 *
 * Names are semantic so humans reading eval scenarios understand
 * which resource each token represents.
 */

/** Gateway tokens */
export const GW = {
  GENERIC: "Hv3tP8YqZ1rKjNm5bXwL",
  STRIPE_US: "Kw9nR4vLpT7mBhJq2XzY",
  EXISTING_STRIPE: "MjR3kN8vTp5hYwBq2LxZ",
  NEW_STRIPE: "PnT7vR3kLm8hBwJq5YxZ",
  STRIPE: "Nk7mP2vRtL9hBqJx4YwZ",
  NEW: "Qr6kN3vPmL8hBwJq2YxZ",
  STRIPE_SANDBOX: "Sv5hR8kNmT3pLwBj7YxZ",
  STRIPE_PRODUCTION: "Tw4kN7vPmL2hBwJq9YxZ",
  PRIMARY: "Vn8kR3mTpL7hBwJq5YxZ",
  FALLBACK: "Xp2kR6mTvL4hBwJq8YxZ",
} as const;

/** Payment method tokens */
export const PM = {
  ALICE_VISA: "Bj3kM8nRvT5hPwLq2YxZ",
  BOB_MC: "Cm4kN9pRvT6hPwLq3YxZ",
  CUSTOMER_A: "Dn5kP2qRvT7hPwLq4YxZ",
  CUSTOMER_B: "Fp6kQ3rSvT8hPwLq5YxZ",
  CUSTOMER_X: "Js9kT6uVvT3hPwLq8YxZ",
  FRESH_CARD: "Gq7kR4sTvN9hPwLq6YxZ",
  NEW_CARD: "Hr8kS5tUvW2hPwLq7YxZ",
  DECLINED_CARD: "Kt2kV7wXvR4hPwLq9YxZ",
  EXPIRED_CARD: "Lv3kW8xYvS5hPwMq2YzK",
  RETURNING: "Mw4kX9yZvT6hPwNq3YzK",
  BATCH_1: "Nx5pR2vT7mKhLqBj4YxZ",
  BATCH_2: "Py6qS3wU8nLjMrCk5ZyW",
  BATCH_3: "Qz7rT4xV9pMkNsDl6WzX",
} as const;

/** Transaction tokens */
export const TXN = {
  AUTH_VOID: "Rw8kY2nRvT7hPwLq4YzK",
  PURCHASE_REFUND: "Sx9kZ3pSvT8hPwLq5YzK",
  AUTH_PARTIAL_CAPTURE: "Ty2k34qTvN9hPwLq6YzK",
  AUTH_THEN_CAPTURE: "Uz3k45rUvW2hPwLq7YzK",
} as const;
