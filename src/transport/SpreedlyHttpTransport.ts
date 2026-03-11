import { mapHttpStatusToError, SpreedlyError } from "./errors.js";
import {
  DEFAULT_BASE_URL,
  DEFAULT_TIMEOUT_MS,
  type RequestOptions,
  type SpreedlyResponse,
  type SpreedlyTransport,
  type TransportConfig,
} from "./types.js";
import { version } from "../../package.json";

export function createTransport(
  environmentKey: string,
  accessSecret: string,
  config: TransportConfig = {},
): SpreedlyTransport {
  const baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  if (!baseUrl.startsWith("https://")) {
    throw new Error("Transport baseUrl must use HTTPS.");
  }
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const authHeader = `Basic ${Buffer.from(`${environmentKey}:${accessSecret}`).toString("base64")}`;

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<SpreedlyResponse<T>> {
    const url = `${baseUrl}${path}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), options.timeout ?? timeoutMs);

    try {
      const headers: Record<string, string> = {
        ...options.headers,
        Authorization: authHeader,
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": `Spreedly/MCP v${version}`
      };

      const fetchOptions: globalThis.RequestInit = {
        method: method.toUpperCase(),
        headers,
        signal: controller.signal,
      };

      if (options.body !== undefined && method.toUpperCase() !== "GET") {
        fetchOptions.body = JSON.stringify(options.body);
      }

      const response = await fetch(url, fetchOptions);
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      let data: T;
      const contentType = response.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        data = (await response.json()) as T;
      } else {
        const text = await response.text();
        data = text as unknown as T;
      }

      if (!response.ok) {
        throw mapHttpStatusToError(response.status, data, responseHeaders["x-request-id"]);
      }

      return { data, status: response.status, headers: responseHeaders };
    } catch (error) {
      if (error instanceof SpreedlyError) {
        throw error;
      }
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new SpreedlyError("Request timed out.", "TIMEOUT", 408);
      }
      if (error instanceof TypeError && error.message.includes("fetch")) {
        throw new SpreedlyError(
          "Unable to connect to the Spreedly API. Check your network connection.",
          "NETWORK_ERROR",
        );
      }
      throw new SpreedlyError(
        "An unexpected error occurred while communicating with the Spreedly API.",
        "UNKNOWN_ERROR",
      );
    } finally {
      clearTimeout(timer);
    }
  }

  return Object.freeze({ request });
}
