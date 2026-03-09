export function fakeGateway(overrides: Record<string, unknown> = {}) {
  return {
    gateway: {
      token: "FakeGWToken_abc123",
      gateway_type: "test",
      name: "Test Gateway",
      state: "retained",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      characteristics: ["purchase", "authorize", "capture", "void", "credit"],
      ...overrides,
    },
  };
}

export function fakeGatewayList() {
  return {
    gateways: [fakeGateway().gateway, fakeGateway({ token: "FakeGWToken_def456" }).gateway],
  };
}

export function fakeGatewayOptions() {
  return {
    gateways: [
      { gateway_type: "test", name: "Spreedly Test", supported_countries: ["US"] },
      { gateway_type: "stripe", name: "Stripe", supported_countries: ["US", "GB"] },
    ],
  };
}

export function fakeTransaction(overrides: Record<string, unknown> = {}) {
  return {
    transaction: {
      token: "FakeTxToken_xyz789",
      transaction_type: "Purchase",
      state: "succeeded",
      succeeded: true,
      amount: 1000,
      currency_code: "USD",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      message: "Succeeded!",
      gateway_token: "FakeGWToken_abc123",
      payment_method_token: "FakePMToken_pm001",
      ...overrides,
    },
  };
}

export function fakeTransactionList() {
  return {
    transactions: [
      fakeTransaction().transaction,
      fakeTransaction({ token: "FakeTxToken_abc456", transaction_type: "Authorization" })
        .transaction,
    ],
  };
}

export function fakePaymentMethod(overrides: Record<string, unknown> = {}) {
  return {
    payment_method: {
      token: "FakePMToken_pm001",
      payment_method_type: "credit_card",
      storage_state: "retained",
      first_name: "Test",
      last_name: "User",
      card_type: "visa",
      last_four_digits: "1111",
      month: 12,
      year: 2030,
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export function fakePaymentMethodList() {
  return {
    payment_methods: [
      fakePaymentMethod().payment_method,
      fakePaymentMethod({ token: "FakePMToken_pm002", card_type: "mastercard" }).payment_method,
    ],
  };
}

export function fakeReceiver(overrides: Record<string, unknown> = {}) {
  return {
    receiver: {
      token: "FakeRXToken_rx001",
      receiver_type: "test",
      state: "retained",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export function fakeCertificate(overrides: Record<string, unknown> = {}) {
  return {
    certificate: {
      token: "FakeCertToken_cert001",
      algorithm: "RSA",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export function fakeEnvironment(overrides: Record<string, unknown> = {}) {
  return {
    environment: {
      key: "FakeEnvKey_env001",
      name: "Test Environment",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export function fakeMerchantProfile(overrides: Record<string, unknown> = {}) {
  return {
    merchant_profile: {
      token: "FakeMPToken_mp001",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export function fakeSubMerchant(overrides: Record<string, unknown> = {}) {
  return {
    sub_merchant: {
      key: "FakeSMKey_sm001",
      created_at: "2025-01-01T00:00:00Z",
      updated_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export function fakeEvent(overrides: Record<string, unknown> = {}) {
  return {
    event: {
      token: "FakeEventToken_ev001",
      event_type: "transaction.succeeded",
      created_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export function fakeAccessSecret(overrides: Record<string, unknown> = {}) {
  return {
    access_secret: {
      token: "FakeASToken_as001",
      created_at: "2025-01-01T00:00:00Z",
      ...overrides,
    },
  };
}

export const FAKE_ENV_KEY = "FakeEnvKey_test123";
export const FAKE_ACCESS_SECRET = "FakeSecret_test456";
