import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createTransport } from "./transport/SpreedlyHttpTransport.js";
import { createServer } from "./server.js";
import { readPolicyFromEnv, getEnabledCategories } from "./security/toolPolicy.js";

async function main() {
  const environmentKey = process.env.SPREEDLY_ENVIRONMENT_KEY;
  const accessSecret = process.env.SPREEDLY_ACCESS_SECRET;

  if (!environmentKey || !accessSecret) {
    const missing: string[] = [];
    if (!environmentKey) missing.push("SPREEDLY_ENVIRONMENT_KEY");
    if (!accessSecret) missing.push("SPREEDLY_ACCESS_SECRET");

    console.error(
      `\nSpreedly MCP: Missing required environment variable(s): ${missing.join(", ")}\n` +
        "\n" +
        "Set them in your MCP client configuration:\n" +
        "\n" +
        '  "env": {\n' +
        '    "SPREEDLY_ENVIRONMENT_KEY": "<your-environment-key>",\n' +
        '    "SPREEDLY_ACCESS_SECRET": "<your-access-secret>"\n' +
        "  }\n" +
        "\n" +
        "Find your credentials at: https://docs.spreedly.com/basics/credentials/\n",
    );
    process.exit(1);
  }

  const policy = readPolicyFromEnv();
  const enabledCategories = getEnabledCategories(policy);
  console.error(
    `Spreedly MCP: Tool policy — enabled categories: ${enabledCategories.join(", ")}`,
  );

  const transport = createTransport(environmentKey, accessSecret);
  const server = createServer(transport, policy);

  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}

main().catch((error) => {
  console.error("Spreedly MCP: Fatal startup error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
