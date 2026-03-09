import type {
  SpreedlyTransport,
  SpreedlyResponse,
  RequestOptions,
} from "../../src/transport/types.js";
import { SpreedlyNotFoundError } from "../../src/transport/errors.js";

export interface MockCall {
  method: string;
  path: string;
  options?: RequestOptions;
}

export interface MockResponseEntry {
  data: unknown;
  status?: number;
  headers?: Record<string, string>;
}

export type MockResponseFn = (
  method: string,
  path: string,
  options?: RequestOptions,
) => MockResponseEntry;

export type MockResponseValue = MockResponseEntry | MockResponseFn;

export function createMockTransport(responses: Map<string, MockResponseValue> = new Map()) {
  const calls: MockCall[] = [];

  const transport: SpreedlyTransport = Object.freeze({
    async request<T>(
      method: string,
      path: string,
      options?: RequestOptions,
    ): Promise<SpreedlyResponse<T>> {
      calls.push({ method, path, options });

      const key = `${method.toUpperCase()} ${path.split("?")[0]}`;
      const raw = responses.get(key) ?? resolveWildcard(method, path, responses);
      if (!raw) {
        throw new SpreedlyNotFoundError(`No mock response for ${key}`);
      }
      const resolved = typeof raw === "function" ? raw(method, path, options) : raw;
      return {
        data: resolved.data as T,
        status: resolved.status ?? 200,
        headers: resolved.headers ?? {},
      };
    },
  });

  return { transport, calls };
}

function resolveWildcard(
  method: string,
  path: string,
  responses: Map<string, MockResponseValue>,
): MockResponseValue | undefined {
  const upperMethod = method.toUpperCase();
  const basePath = path.split("?")[0];
  for (const [key, value] of responses.entries()) {
    const [keyMethod, keyPath] = key.split(" ", 2);
    if (keyMethod !== upperMethod) continue;
    if (keyPath.includes("*")) {
      const pattern = keyPath.replace(/\*/g, "[^/]+");
      if (new RegExp(`^${pattern}$`).test(basePath)) return value;
    }
  }
  return undefined;
}
