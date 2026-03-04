import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpreedlyTransport } from "./transport/types.js";
import { allTools } from "./domains/index.js";
import { wrapHandler } from "./security/middleware.js";
import { z } from "zod";

const SERVER_NAME = "spreedly-mcp";
const SERVER_VERSION = "0.1.0";

export function createServer(transport: SpreedlyTransport): McpServer {
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  for (const tool of allTools) {
    const zodShape = buildZodShape(tool.schema);
    const wrapped = wrapHandler(
      tool.handler,
      (raw) => {
        if (Object.keys(zodShape).length === 0) return raw as Record<string, unknown>;
        const schema = z.object(zodShape).strict();
        return schema.parse(raw) as Record<string, unknown>;
      },
    );

    server.tool(
      tool.name,
      tool.description,
      tool.schema,
      async (params: Record<string, unknown>) => {
        return wrapped(params, { transport });
      },
    );
  }

  return server;
}

function buildZodShape(schema: Record<string, unknown>): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (value instanceof z.ZodType) {
      shape[key] = value;
    }
  }
  return shape;
}

export { SERVER_NAME, SERVER_VERSION };
