import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpreedlyTransport } from "./transport/types.js";
import { allTools } from "./domains/index.js";
import { wrapHandler } from "./security/middleware.js";
import {
  filterTools,
  getToolDescription,
  type ToolPolicyConfig,
} from "./security/toolPolicy.js";
import { z } from "zod";

const SERVER_NAME = "spreedly-mcp";
const SERVER_VERSION = "0.1.0";

export function createServer(
  transport: SpreedlyTransport,
  policy: ToolPolicyConfig,
): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  const enabledTools = filterTools(allTools, policy);

  for (const tool of enabledTools) {
    const description = getToolDescription(tool);
    const wrapped = wrapHandler(
      tool.handler,
      (raw) => {
        if (Object.keys(tool.schema).length === 0) return raw as Record<string, unknown>;
        const schema = z.object(tool.schema).strict();
        return schema.parse(raw) as Record<string, unknown>;
      },
    );

    server.registerTool(
      tool.name,
      {
        description,
        inputSchema: tool.schema,
      },
      async (params: Record<string, unknown>) => {
        return wrapped(params, { transport });
      },
    );
  }

  return server;
}

export { SERVER_NAME, SERVER_VERSION };
