import { describe, it, expect, afterEach } from "vitest";
import { createMcpHarness, type McpHarness } from "../helpers/mcp-harness.js";
import { SERVER_INSTRUCTIONS } from "../../src/server.js";
import { fakeTransaction, fakeGatewayList } from "../helpers/fixtures.js";
import type { ToolPolicyConfig } from "../../src/security/toolPolicy.js";
import type { MockResponseValue } from "../helpers/transport.js";

const ALL_ENABLED: ToolPolicyConfig = {
  paymentMethodTokenizationEnabled: true,
  transactionInitiationEnabled: true,
  administrativeEnabled: true,
};

const ALL_DISABLED: ToolPolicyConfig = {
  paymentMethodTokenizationEnabled: false,
  transactionInitiationEnabled: false,
  administrativeEnabled: false,
};

const ALWAYS_ENABLED_TOOLS = [
  "spreedly_card_refresher_list_inquiries",
  "spreedly_card_refresher_show_inquiry",
  "spreedly_event_list",
  "spreedly_event_show",
  "spreedly_gateway_list",
  "spreedly_gateway_list_supported",
  "spreedly_gateway_list_transactions",
  "spreedly_gateway_show",
  "spreedly_merchant_profile_list",
  "spreedly_merchant_profile_show",
  "spreedly_network_tokenization_card_metadata",
  "spreedly_network_tokenization_token_status",
  "spreedly_payment_method_delete_metadata",
  "spreedly_payment_method_list",
  "spreedly_payment_method_list_all_events",
  "spreedly_payment_method_list_events",
  "spreedly_payment_method_list_transactions",
  "spreedly_payment_method_retain",
  "spreedly_payment_method_show",
  "spreedly_payment_method_show_event",
  "spreedly_payment_method_update",
  "spreedly_payment_method_update_gratis",
  "spreedly_protection_list_events",
  "spreedly_protection_show_event",
  "spreedly_protection_show_provider",
  "spreedly_sca_show_provider",
  "spreedly_sub_merchant_list",
  "spreedly_sub_merchant_show",
  "spreedly_transaction_list",
  "spreedly_transaction_show",
  "spreedly_transaction_transcript",
  "spreedly_transaction_update",
];

const TRANSACTION_INITIATION_TOOLS = [
  "spreedly_card_refresher_inquiry",
  "spreedly_gateway_authorize",
  "spreedly_gateway_general_credit",
  "spreedly_gateway_purchase",
  "spreedly_gateway_store",
  "spreedly_gateway_verify",
  "spreedly_protection_create_provider",
  "spreedly_protection_forward_claim",
  "spreedly_sca_authenticate",
  "spreedly_transaction_capture",
  "spreedly_transaction_complete",
  "spreedly_transaction_confirm",
  "spreedly_transaction_credit",
  "spreedly_transaction_void",
];

const ADMINISTRATIVE_TOOLS = [
  "spreedly_certificate_create",
  "spreedly_certificate_generate",
  "spreedly_certificate_list",
  "spreedly_certificate_update",
  "spreedly_environment_create",
  "spreedly_environment_list",
  "spreedly_environment_show",
  "spreedly_environment_update",
  "spreedly_gateway_create",
  "spreedly_gateway_retain",
  "spreedly_gateway_update",
  "spreedly_merchant_profile_create",
  "spreedly_merchant_profile_update",
  "spreedly_sca_create_provider",
  "spreedly_sub_merchant_create",
  "spreedly_sub_merchant_update",
];

const PAYMENT_METHOD_TOKENIZATION_TOOLS = [
  "spreedly_payment_method_create",
  "spreedly_payment_method_recache",
];

let harness: McpHarness;

afterEach(async () => {
  if (harness) await harness.close();
});

describe("MCP server instructions", () => {
  it("delivers SERVER_INSTRUCTIONS to the client", async () => {
    harness = await createMcpHarness(ALL_DISABLED);
    const instructions = harness.client.getInstructions();
    expect(instructions).toBe(SERVER_INSTRUCTIONS);
  });

  it("instructions contain key sections", async () => {
    harness = await createMcpHarness(ALL_DISABLED);
    const instructions = harness.client.getInstructions()!;
    expect(instructions).toContain("Terminology");
    expect(instructions).toContain("Should I Reuse a Token");
    expect(instructions).toContain("Amount Format");
    expect(instructions).toContain("Common Workflows");
  });
});

describe("MCP tool listing", () => {
  it("returns exactly the always-enabled tools when all categories disabled", async () => {
    harness = await createMcpHarness(ALL_DISABLED);
    const { tools } = await harness.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(ALWAYS_ENABLED_TOOLS);
  });

  it("adds exactly the transaction tools when transactionInitiationEnabled", async () => {
    harness = await createMcpHarness({
      ...ALL_DISABLED,
      transactionInitiationEnabled: true,
    });
    const { tools } = await harness.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...ALWAYS_ENABLED_TOOLS, ...TRANSACTION_INITIATION_TOOLS].sort());
  });

  it("adds exactly the admin tools when administrativeEnabled", async () => {
    harness = await createMcpHarness({
      ...ALL_DISABLED,
      administrativeEnabled: true,
    });
    const { tools } = await harness.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...ALWAYS_ENABLED_TOOLS, ...ADMINISTRATIVE_TOOLS].sort());
  });

  it("adds exactly the tokenization tools when paymentMethodTokenizationEnabled", async () => {
    harness = await createMcpHarness({
      ...ALL_DISABLED,
      paymentMethodTokenizationEnabled: true,
    });
    const { tools } = await harness.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual([...ALWAYS_ENABLED_TOOLS, ...PAYMENT_METHOD_TOKENIZATION_TOOLS].sort());
  });

  it("returns exactly all tools when everything is enabled", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    const names = tools.map((t) => t.name).sort();
    expect(names).toEqual(
      [
        ...ALWAYS_ENABLED_TOOLS,
        ...TRANSACTION_INITIATION_TOOLS,
        ...ADMINISTRATIVE_TOOLS,
        ...PAYMENT_METHOD_TOKENIZATION_TOOLS,
      ].sort(),
    );
  });
});

describe("MCP tool annotations", () => {
  it("read-only tools have readOnlyHint annotation", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    const listTool = tools.find((t) => t.name === "spreedly_gateway_list");
    expect(listTool?.annotations?.readOnlyHint).toBe(true);
  });

  it("destructive tools have destructiveHint annotation", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    const purchaseTool = tools.find((t) => t.name === "spreedly_gateway_purchase");
    expect(purchaseTool?.annotations?.destructiveHint).toBe(true);
  });

  it("annotations are delivered as structured objects, not strings", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    for (const tool of tools) {
      if (tool.annotations) {
        expect(typeof tool.annotations).toBe("object");
        if (tool.annotations.readOnlyHint !== undefined) {
          expect(typeof tool.annotations.readOnlyHint).toBe("boolean");
        }
      }
    }
  });
});

describe("MCP tool schemas", () => {
  it("tool inputSchema is JSON Schema (not raw Zod)", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    const purchaseTool = tools.find((t) => t.name === "spreedly_gateway_purchase");
    expect(purchaseTool?.inputSchema.type).toBe("object");
    expect(purchaseTool?.inputSchema.properties).toBeDefined();
  });

  it("required fields are marked in JSON Schema", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    const showTool = tools.find((t) => t.name === "spreedly_gateway_show");
    expect(showTool?.inputSchema.required).toContain("gateway_token");
  });
});

describe("MCP tool descriptions", () => {
  it("transaction tools include category guidance suffix", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    const purchaseTool = tools.find((t) => t.name === "spreedly_gateway_purchase");
    expect(purchaseTool?.description).toContain("[Enabled by TRANSACTION_INITIATION_ENABLED=true]");
  });

  it("read-only tools do not have a category suffix", async () => {
    harness = await createMcpHarness(ALL_ENABLED);
    const { tools } = await harness.client.listTools();
    const listTool = tools.find((t) => t.name === "spreedly_gateway_list");
    expect(listTool?.description).not.toContain("[Enabled by");
  });
});

describe("MCP callTool through full stack", () => {
  it("returns mock data through wrapHandler for a valid call", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      ["GET /gateways.json", { data: fakeGatewayList() }],
    ]);
    harness = await createMcpHarness(ALL_DISABLED, mockResponses);

    const result = await harness.client.callTool({
      name: "spreedly_gateway_list",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gateways).toHaveLength(2);
  });

  it("records Spreedly transport calls", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      ["GET /gateways.json", { data: fakeGatewayList() }],
    ]);
    harness = await createMcpHarness(ALL_DISABLED, mockResponses);

    await harness.client.callTool({ name: "spreedly_gateway_list", arguments: {} });

    expect(harness.spreedlyCalls).toHaveLength(1);
    expect(harness.spreedlyCalls[0].method).toBe("GET");
    expect(harness.spreedlyCalls[0].path).toBe("/gateways.json");
  });

  it("write tools go through middleware and reach the mock transport", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "POST /gateways/GW_test/purchase.json",
        {
          data: fakeTransaction({
            transaction_type: "Purchase",
            gateway_token: "GW_test",
            payment_method_token: "PM_test",
            amount: 1000,
            currency_code: "USD",
          }),
        },
      ],
    ]);
    harness = await createMcpHarness(
      { ...ALL_DISABLED, transactionInitiationEnabled: true },
      mockResponses,
    );

    const result = await harness.client.callTool({
      name: "spreedly_gateway_purchase",
      arguments: {
        gateway_token: "GW_test",
        payment_method_token: "PM_test",
        amount: 1000,
        currency_code: "USD",
      },
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.transaction.succeeded).toBe(true);
    expect(parsed.transaction.amount).toBe(1000);
  });

  it("successful responses include _metadata with httpStatusCode and durationMs", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "GET /gateways.json",
        { data: fakeGatewayList(), headers: { "x-request-id": "req-meta-001" } },
      ],
    ]);
    harness = await createMcpHarness(ALL_DISABLED, mockResponses);

    const result = await harness.client.callTool({
      name: "spreedly_gateway_list",
      arguments: {},
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.gateways).toHaveLength(2);
    expect(parsed._metadata).toBeDefined();
    expect(parsed._metadata.httpStatusCode).toBe(200);
    expect(parsed._metadata.requestId).toBe("req-meta-001");
    expect(typeof parsed._metadata.durationMs).toBe("number");
    expect(parsed._metadata.durationMs).toBeGreaterThanOrEqual(0);
  });

  it("_metadata.durationMs is present even without x-request-id", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      ["GET /gateways.json", { data: fakeGatewayList() }],
    ]);
    harness = await createMcpHarness(ALL_DISABLED, mockResponses);

    const result = await harness.client.callTool({
      name: "spreedly_gateway_list",
      arguments: {},
    });

    const parsed = JSON.parse((result.content as Array<{ type: string; text: string }>)[0].text);
    expect(parsed._metadata.durationMs).toBeGreaterThanOrEqual(0);
    expect(parsed._metadata.httpStatusCode).toBe(200);
    expect(parsed._metadata.requestId).toBeUndefined();
  });

  it("returns structured error when mock transport has no matching response", async () => {
    harness = await createMcpHarness(ALL_DISABLED);

    const result = await harness.client.callTool({
      name: "spreedly_gateway_list",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    const parsed = JSON.parse(text);
    expect(parsed.error.httpStatusCode).toBe(404);
    expect(parsed.error.message).toContain("No mock response");
    expect(parsed._metadata).toBeDefined();
    expect(typeof parsed._metadata.durationMs).toBe("number");
  });
});

describe("MCP error data capture from Spreedly API", () => {
  function parseError(result: Record<string, unknown>) {
    const content = result.content as Array<{ type: string; text: string }>;
    return JSON.parse(content[0].text) as {
      error: Record<string, unknown>;
      _metadata: Record<string, unknown>;
    };
  }

  it("surfaces 422 validation error with field details", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "POST /gateways.json",
        {
          data: {
            errors: {
              gateway_type: ["can't be blank"],
              login: ["is required for this gateway type"],
            },
          },
          status: 422,
        },
      ],
    ]);
    harness = await createMcpHarness(
      { ...ALL_DISABLED, administrativeEnabled: true },
      mockResponses,
    );

    const result = await harness.client.callTool({
      name: "spreedly_gateway_create",
      arguments: { gateway_type: "" },
    });

    expect(result.isError).toBe(true);
    const parsed = parseError(result);
    expect(parsed.error.httpStatusCode).toBe(422);
    expect(parsed.error.fieldErrors).toEqual({
      gateway_type: ["can't be blank"],
      login: ["is required for this gateway type"],
    });
    expect(parsed._metadata.httpStatusCode).toBe(422);
    expect(typeof parsed._metadata.durationMs).toBe("number");
  });

  it("surfaces 422 error with Spreedly errors array format (key + message)", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "POST /gateways/*/authorize.json",
        {
          data: {
            errors: [
              { key: "errors.amount", message: "Amount is required." },
              { key: "errors.currency_code", message: "Currency code is required." },
            ],
          },
          status: 422,
        },
      ],
    ]);
    harness = await createMcpHarness(
      { ...ALL_DISABLED, transactionInitiationEnabled: true },
      mockResponses,
    );

    const result = await harness.client.callTool({
      name: "spreedly_gateway_authorize",
      arguments: {
        gateway_token: "GW_test",
        payment_method_token: "PM_test",
        amount: 1000,
        currency_code: "USD",
      },
    });

    expect(result.isError).toBe(true);
    const parsed = parseError(result);
    expect(parsed.error.httpStatusCode).toBe(422);
    expect(parsed.error.message).toContain("Amount is required.");
    expect(parsed.error.message).toContain("Currency code is required.");
    expect(parsed.error.fieldErrors).toEqual({
      amount: ["Amount is required."],
      currency_code: ["Currency code is required."],
    });
    expect(parsed._metadata.httpStatusCode).toBe(422);
  });

  it("surfaces 401 auth errors", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "GET /gateways.json",
        {
          data: {
            error: "Unable to authenticate using the given environment_key and access_token.",
          },
          status: 401,
        },
      ],
    ]);
    harness = await createMcpHarness(ALL_DISABLED, mockResponses);

    const result = await harness.client.callTool({
      name: "spreedly_gateway_list",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const parsed = parseError(result);
    expect(parsed.error.httpStatusCode).toBe(401);
    expect(parsed._metadata.httpStatusCode).toBe(401);
  });

  it("surfaces 402 payment errors with transactionToken", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "POST /gateways/*/purchase.json",
        {
          data: {
            errors: [{ key: "errors.payment_method", message: "The payment method is not valid." }],
            transaction_token: "TxnToken_402_abc",
          },
          status: 402,
        },
      ],
    ]);
    harness = await createMcpHarness(
      { ...ALL_DISABLED, transactionInitiationEnabled: true },
      mockResponses,
    );

    const result = await harness.client.callTool({
      name: "spreedly_gateway_purchase",
      arguments: {
        gateway_token: "GW_test",
        payment_method_token: "PM_bad",
        amount: 1000,
        currency_code: "USD",
      },
    });

    expect(result.isError).toBe(true);
    const parsed = parseError(result);
    expect(parsed.error.httpStatusCode).toBe(402);
    expect(parsed.error.message).toContain("The payment method is not valid.");
    expect(parsed.error.transactionToken).toBe("TxnToken_402_abc");
    expect(parsed._metadata.httpStatusCode).toBe(402);
  });

  it("surfaces 429 rate limit errors with retryAfterMs", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "GET /gateways.json",
        {
          data: { error: "Rate limit exceeded" },
          status: 429,
          headers: { "retry-after": "30" },
        },
      ],
    ]);
    harness = await createMcpHarness(ALL_DISABLED, mockResponses);

    const result = await harness.client.callTool({
      name: "spreedly_gateway_list",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const parsed = parseError(result);
    expect(parsed.error.httpStatusCode).toBe(429);
    expect(parsed.error.retryAfterMs).toBe(30000);
    expect(parsed._metadata.httpStatusCode).toBe(429);
  });

  it("includes requestId in _metadata when present", async () => {
    const mockResponses = new Map<string, MockResponseValue>([
      [
        "GET /gateways.json",
        {
          data: { error: "Not found" },
          status: 404,
          headers: { "x-request-id": "req-debug-12345" },
        },
      ],
    ]);
    harness = await createMcpHarness(ALL_DISABLED, mockResponses);

    const result = await harness.client.callTool({
      name: "spreedly_gateway_list",
      arguments: {},
    });

    expect(result.isError).toBe(true);
    const parsed = parseError(result);
    expect(parsed.error.httpStatusCode).toBe(404);
    expect(parsed._metadata.httpStatusCode).toBe(404);
    expect(parsed._metadata.requestId).toBe("req-debug-12345");
    expect(typeof parsed._metadata.durationMs).toBe("number");
  });
});
