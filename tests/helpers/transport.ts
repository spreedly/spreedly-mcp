import type { SpreedlyTransport, SpreedlyResponse, RequestOptions } from "../../src/transport/types.js";
import { SpreedlyNotFoundError } from "../../src/transport/errors.js";

export interface MockCall {
  method: string;
  path: string;
  options?: RequestOptions;
}

export function createMockTransport(
  responses: Map<string, { data: unknown; status?: number }> = new Map(),
) {
  const calls: MockCall[] = [];

  const transport: SpreedlyTransport = Object.freeze({
    async request<T>(
      method: string,
      path: string,
      options?: RequestOptions,
    ): Promise<SpreedlyResponse<T>> {
      calls.push({ method, path, options });

      const key = `${method.toUpperCase()} ${path.split("?")[0]}`;
      const match = responses.get(key);
      if (!match) {
        const wildcardKey = findWildcardMatch(method, path, responses);
        if (wildcardKey) {
          const wildcardMatch = responses.get(wildcardKey)!;
          return {
            data: wildcardMatch.data as T,
            status: wildcardMatch.status ?? 200,
            headers: {},
          };
        }
        throw new SpreedlyNotFoundError(`No mock response for ${key}`);
      }
      return {
        data: match.data as T,
        status: match.status ?? 200,
        headers: {},
      };
    },
  });

  return { transport, calls };
}

function findWildcardMatch(
  method: string,
  path: string,
  responses: Map<string, { data: unknown; status?: number }>,
): string | undefined {
  const upperMethod = method.toUpperCase();
  const basePath = path.split("?")[0];
  for (const key of responses.keys()) {
    const [keyMethod, keyPath] = key.split(" ", 2);
    if (keyMethod !== upperMethod) continue;
    if (keyPath.includes("*")) {
      const pattern = keyPath.replace(/\*/g, "[^/]+");
      if (new RegExp(`^${pattern}$`).test(basePath)) return key;
    }
  }
  return undefined;
}
