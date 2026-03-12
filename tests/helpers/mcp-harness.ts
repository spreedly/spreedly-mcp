import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer } from "../../src/server.js";
import { createMockTransport, type MockResponseValue, type MockCall } from "./transport.js";
import type { ToolPolicyConfig } from "../../src/security/toolPolicy.js";

export interface McpHarness {
  client: Client;
  spreedlyCalls: MockCall[];
  close: () => Promise<void>;
}

/**
 * Creates a fully-wired MCP client/server pair connected via in-memory transport.
 * The only mock is the Spreedly HTTP transport -- everything above it
 * (server creation, tool registration, wrapHandler middleware, Zod validation,
 * sanitization, error formatting, audit logging) runs for real.
 */
export async function createMcpHarness(
  policy: ToolPolicyConfig,
  mockResponses: Map<string, MockResponseValue> = new Map(),
): Promise<McpHarness> {
  const { transport: spreedlyTransport, calls } = createMockTransport(mockResponses);

  const server = createServer(spreedlyTransport, policy, {
    environmentKey: "test_env_key",
    silent: true,
  });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "eval-harness", version: "1.0.0" });
  await client.connect(clientTransport);

  return {
    client,
    spreedlyCalls: calls,
    close: async () => {
      await clientTransport.close();
      await serverTransport.close();
    },
  };
}
