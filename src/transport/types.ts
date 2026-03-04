export interface SpreedlyResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
}

export interface RequestOptions {
  body?: unknown;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface SpreedlyTransport {
  request<T>(method: string, path: string, options?: RequestOptions): Promise<SpreedlyResponse<T>>;
}

export interface TransportConfig {
  baseUrl?: string;
  timeoutMs?: number;
}

export const DEFAULT_BASE_URL = "https://core.spreedly.com/v1";
export const DEFAULT_TIMEOUT_MS = 30_000;
