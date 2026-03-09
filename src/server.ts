import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SpreedlyTransport } from "./transport/types.js";
import { allTools } from "./domains/index.js";
import { wrapHandler } from "./security/middleware.js";
import { ENV_KEY_PREFIX_LENGTH } from "./security/audit-logger.js";
import { z } from "zod";

const SERVER_NAME = "spreedly-mcp";
const SERVER_VERSION = "0.1.0";

export function createServer(
  transport: SpreedlyTransport,
  options: { envKeyPrefix: string },
): McpServer {
  const { envKeyPrefix } = options ?? {};
  if (typeof envKeyPrefix !== "string" || envKeyPrefix.length !== ENV_KEY_PREFIX_LENGTH) {
    throw new Error(
      `createServer requires options.envKeyPrefix to be a ${ENV_KEY_PREFIX_LENGTH}-character string ` +
        `(got ${typeof envKeyPrefix === "string" ? `"${envKeyPrefix}" (length ${envKeyPrefix.length})` : String(envKeyPrefix)}). ` +
        "Use validateAndExtractPrefix() to derive it from SPREEDLY_ENVIRONMENT_KEY.",
    );
  }

  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  for (const tool of allTools) {
    const zodShape = buildZodShape(tool.schema);
    const wrapped = wrapHandler(
      tool.name,
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
        return wrapped(params, { transport, envKeyPrefix });
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
