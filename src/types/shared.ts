export interface PaginationParams {
  since_token?: string;
  order?: "asc" | "desc";
}

export interface SpreedlyTransaction {
  token: string;
  transaction_type: string;
  state: string;
  succeeded: boolean;
  amount: number;
  currency_code: string;
  created_at: string;
  updated_at: string;
  message: string;
  gateway_token?: string;
  payment_method_token?: string;
  [key: string]: unknown;
}

export interface SpreedlyGateway {
  token: string;
  gateway_type: string;
  name: string;
  state: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SpreedlyPaymentMethod {
  token: string;
  payment_method_type: string;
  storage_state: string;
  data: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  first_name?: string;
  last_name?: string;
  number?: string;
  card_type?: string;
  [key: string]: unknown;
}

export interface SpreedlyReceiver {
  token: string;
  receiver_type: string;
  state: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SpreedlyCertificate {
  token: string;
  algorithm: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SpreedlyEnvironment {
  key: string;
  name: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SpreedlyAccessSecret {
  token: string;
  created_at: string;
  [key: string]: unknown;
}

export interface SpreedlyMerchantProfile {
  token: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SpreedlySubMerchant {
  key: string;
  created_at: string;
  updated_at: string;
  [key: string]: unknown;
}

export interface SpreedlyEvent {
  token?: string;
  id?: string | number;
  event_type: string;
  created_at: string;
  [key: string]: unknown;
}

export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, import("zod").ZodTypeAny>;
  handler: (
    params: Record<string, unknown>,
    ctx: { transport: import("../transport/types.js").SpreedlyTransport },
  ) => Promise<unknown>;
}
