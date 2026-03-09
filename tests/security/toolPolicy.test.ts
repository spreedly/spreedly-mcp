import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  readPolicyFromEnv,
  parseBoolEnv,
  filterTools,
  getToolDescription,
  getToolCategory,
  getEnabledCategories,
  isToolEnabled,
  CATEGORY_GUIDANCE,
  type ToolPolicyConfig,
} from "../../src/security/toolPolicy.js";
import { allTools } from "../../src/domains/index.js";
import type { ToolDefinition } from "../../src/types/shared.js";

function makeTool(name: string, description = "Test tool"): ToolDefinition {
  return {
    name,
    description,
    schema: {},
    handler: async () => ({}),
  };
}

const ALL_DISABLED: ToolPolicyConfig = {
  paymentMethodTokenizationEnabled: false,
  transactionInitiationEnabled: false,
  administrativeEnabled: false,
};

const ALL_ENABLED: ToolPolicyConfig = {
  paymentMethodTokenizationEnabled: true,
  transactionInitiationEnabled: true,
  administrativeEnabled: true,
};

describe("readPolicyFromEnv", () => {
  const envVars = [
    "PAYMENT_METHOD_TOKENIZATION_ENABLED",
    "TRANSACTION_INITIATION_ENABLED",
    "ADMINISTRATIVE_ENABLED",
  ] as const;

  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    savedEnv = {};
    for (const key of envVars) {
      savedEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of envVars) {
      if (savedEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = savedEnv[key];
      }
    }
  });

  it("defaults all flags to false when env vars are unset", () => {
    const policy = readPolicyFromEnv();
    expect(policy.paymentMethodTokenizationEnabled).toBe(false);
    expect(policy.transactionInitiationEnabled).toBe(false);
    expect(policy.administrativeEnabled).toBe(false);
  });

  it("enables flags only when set to exactly 'true'", () => {
    process.env.PAYMENT_METHOD_TOKENIZATION_ENABLED = "true";
    process.env.TRANSACTION_INITIATION_ENABLED = "true";
    process.env.ADMINISTRATIVE_ENABLED = "true";

    const policy = readPolicyFromEnv();
    expect(policy.paymentMethodTokenizationEnabled).toBe(true);
    expect(policy.transactionInitiationEnabled).toBe(true);
    expect(policy.administrativeEnabled).toBe(true);
  });

  it("accepts case-insensitive 'true' variants", () => {
    process.env.PAYMENT_METHOD_TOKENIZATION_ENABLED = "TRUE";
    process.env.TRANSACTION_INITIATION_ENABLED = "True";
    process.env.ADMINISTRATIVE_ENABLED = "tRuE";

    const policy = readPolicyFromEnv();
    expect(policy.paymentMethodTokenizationEnabled).toBe(true);
    expect(policy.transactionInitiationEnabled).toBe(true);
    expect(policy.administrativeEnabled).toBe(true);
  });

  it("treats '1', 'yes', and empty string as false", () => {
    process.env.PAYMENT_METHOD_TOKENIZATION_ENABLED = "1";
    process.env.TRANSACTION_INITIATION_ENABLED = "yes";
    process.env.ADMINISTRATIVE_ENABLED = "";

    const policy = readPolicyFromEnv();
    expect(policy.paymentMethodTokenizationEnabled).toBe(false);
    expect(policy.transactionInitiationEnabled).toBe(false);
    expect(policy.administrativeEnabled).toBe(false);
  });

  it("enables individual flags independently", () => {
    process.env.TRANSACTION_INITIATION_ENABLED = "true";

    const policy = readPolicyFromEnv();
    expect(policy.paymentMethodTokenizationEnabled).toBe(false);
    expect(policy.transactionInitiationEnabled).toBe(true);
    expect(policy.administrativeEnabled).toBe(false);
  });
});

describe("parseBoolEnv", () => {
  it("returns true for boolean true", () => {
    expect(parseBoolEnv(true)).toBe(true);
  });

  it("returns true for string 'true' in any case", () => {
    expect(parseBoolEnv("true")).toBe(true);
    expect(parseBoolEnv("TRUE")).toBe(true);
    expect(parseBoolEnv("True")).toBe(true);
  });

  it("returns false for boolean false", () => {
    expect(parseBoolEnv(false)).toBe(false);
  });

  it("returns false for undefined and null", () => {
    expect(parseBoolEnv(undefined)).toBe(false);
    expect(parseBoolEnv(null)).toBe(false);
  });

  it("returns false for non-true strings", () => {
    expect(parseBoolEnv("false")).toBe(false);
    expect(parseBoolEnv("1")).toBe(false);
    expect(parseBoolEnv("yes")).toBe(false);
    expect(parseBoolEnv("")).toBe(false);
  });

  it("returns false for numbers and other types", () => {
    expect(parseBoolEnv(1)).toBe(false);
    expect(parseBoolEnv(0)).toBe(false);
  });
});

describe("getToolCategory", () => {
  it("returns 'payment_method_tokenization' for tokenization tools", () => {
    expect(getToolCategory("spreedly_payment_method_create")).toBe("payment_method_tokenization");
    expect(getToolCategory("spreedly_payment_method_recache")).toBe("payment_method_tokenization");
  });

  it("returns 'transaction_initiation' for transaction tools", () => {
    expect(getToolCategory("spreedly_gateway_authorize")).toBe("transaction_initiation");
    expect(getToolCategory("spreedly_transaction_capture")).toBe("transaction_initiation");
    expect(getToolCategory("spreedly_sca_authenticate")).toBe("transaction_initiation");
  });

  it("returns 'administrative' for admin tools", () => {
    expect(getToolCategory("spreedly_gateway_create")).toBe("administrative");
    expect(getToolCategory("spreedly_environment_create")).toBe("administrative");
    expect(getToolCategory("spreedly_merchant_profile_create")).toBe("administrative");
  });

  it("returns 'always_disabled' for disabled tools", () => {
    expect(getToolCategory("spreedly_receiver_create")).toBe("always_disabled");
    expect(getToolCategory("spreedly_gateway_redact")).toBe("always_disabled");
    expect(getToolCategory("spreedly_payment_method_redact")).toBe("always_disabled");
    expect(getToolCategory("spreedly_transaction_authorize_workflow")).toBe("always_disabled");
  });

  it("returns 'always_enabled' for unmapped tools (default)", () => {
    expect(getToolCategory("spreedly_gateway_list")).toBe("always_enabled");
    expect(getToolCategory("spreedly_transaction_show")).toBe("always_enabled");
    expect(getToolCategory("spreedly_event_list")).toBe("always_enabled");
  });
});

describe("isToolEnabled", () => {
  it("always enables always_enabled tools regardless of config", () => {
    expect(isToolEnabled("spreedly_gateway_list", ALL_DISABLED)).toBe(true);
    expect(isToolEnabled("spreedly_gateway_list", ALL_ENABLED)).toBe(true);
  });

  it("always disables always_disabled tools regardless of config", () => {
    expect(isToolEnabled("spreedly_receiver_create", ALL_DISABLED)).toBe(false);
    expect(isToolEnabled("spreedly_receiver_create", ALL_ENABLED)).toBe(false);
  });

  it("respects paymentMethodTokenizationEnabled flag", () => {
    expect(isToolEnabled("spreedly_payment_method_create", ALL_DISABLED)).toBe(false);
    expect(isToolEnabled("spreedly_payment_method_create", { ...ALL_DISABLED, paymentMethodTokenizationEnabled: true })).toBe(true);
  });

  it("respects transactionInitiationEnabled flag", () => {
    expect(isToolEnabled("spreedly_gateway_authorize", ALL_DISABLED)).toBe(false);
    expect(isToolEnabled("spreedly_gateway_authorize", { ...ALL_DISABLED, transactionInitiationEnabled: true })).toBe(true);
  });

  it("respects administrativeEnabled flag", () => {
    expect(isToolEnabled("spreedly_gateway_create", ALL_DISABLED)).toBe(false);
    expect(isToolEnabled("spreedly_gateway_create", { ...ALL_DISABLED, administrativeEnabled: true })).toBe(true);
  });
});

describe("filterTools", () => {
  const tools: ToolDefinition[] = [
    makeTool("spreedly_gateway_list"),
    makeTool("spreedly_gateway_create"),
    makeTool("spreedly_gateway_authorize"),
    makeTool("spreedly_payment_method_create"),
    makeTool("spreedly_receiver_create"),
  ];

  it("with all flags disabled, only always_enabled tools remain", () => {
    const result = filterTools(tools, ALL_DISABLED);
    const names = result.map((t) => t.name);
    expect(names).toEqual(["spreedly_gateway_list"]);
  });

  it("with all flags enabled, always_disabled tools are still excluded", () => {
    const result = filterTools(tools, ALL_ENABLED);
    const names = result.map((t) => t.name);
    expect(names).toContain("spreedly_gateway_list");
    expect(names).toContain("spreedly_gateway_create");
    expect(names).toContain("spreedly_gateway_authorize");
    expect(names).toContain("spreedly_payment_method_create");
    expect(names).not.toContain("spreedly_receiver_create");
  });

  it("enables only the requested category", () => {
    const txnOnly: ToolPolicyConfig = {
      ...ALL_DISABLED,
      transactionInitiationEnabled: true,
    };
    const result = filterTools(tools, txnOnly);
    const names = result.map((t) => t.name);
    expect(names).toEqual(["spreedly_gateway_list", "spreedly_gateway_authorize"]);
  });
});

describe("getToolDescription", () => {
  it("appends administrative guidance for admin tools", () => {
    const tool = makeTool("spreedly_gateway_create", "Creates a gateway.");
    const desc = getToolDescription(tool);
    expect(desc).toBe(`Creates a gateway. ${CATEGORY_GUIDANCE.administrative}`);
  });

  it("appends transaction guidance for transaction tools", () => {
    const tool = makeTool("spreedly_gateway_authorize", "Authorizes a payment.");
    const desc = getToolDescription(tool);
    expect(desc).toBe(`Authorizes a payment. ${CATEGORY_GUIDANCE.transaction_initiation}`);
  });

  it("appends tokenization guidance for tokenization tools", () => {
    const tool = makeTool("spreedly_payment_method_create", "Creates a PM.");
    const desc = getToolDescription(tool);
    expect(desc).toBe(`Creates a PM. ${CATEGORY_GUIDANCE.payment_method_tokenization}`);
  });

  it("returns base description unchanged for always_enabled tools", () => {
    const tool = makeTool("spreedly_gateway_list", "Lists gateways.");
    const desc = getToolDescription(tool);
    expect(desc).toBe("Lists gateways.");
  });
});

describe("getEnabledCategories", () => {
  it("returns only always_enabled when all flags are false", () => {
    expect(getEnabledCategories(ALL_DISABLED)).toEqual(["always_enabled"]);
  });

  it("includes all categories when all flags are true", () => {
    const cats = getEnabledCategories(ALL_ENABLED);
    expect(cats).toContain("always_enabled");
    expect(cats).toContain("payment_method_tokenization");
    expect(cats).toContain("transaction_initiation");
    expect(cats).toContain("administrative");
  });

  it("includes only the enabled category", () => {
    const cats = getEnabledCategories({
      ...ALL_DISABLED,
      transactionInitiationEnabled: true,
    });
    expect(cats).toEqual(["always_enabled", "transaction_initiation"]);
  });
});

describe("enriched description content", () => {
  it("every transaction_initiation tool description contains [Transaction] guidance", () => {
    const txnTools = allTools.filter(
      (t) => getToolCategory(t.name) === "transaction_initiation",
    );
    expect(txnTools.length).toBeGreaterThan(0);

    for (const tool of txnTools) {
      const desc = getToolDescription(tool);
      expect(desc).toContain("[Transaction]");
      expect(desc).toContain("verify it is the right resource");
    }
  });

  it("every administrative tool description contains [Configuration] guidance", () => {
    const adminTools = allTools.filter(
      (t) => getToolCategory(t.name) === "administrative",
    );
    expect(adminTools.length).toBeGreaterThan(0);

    for (const tool of adminTools) {
      const desc = getToolDescription(tool);
      expect(desc).toContain("[Configuration]");
      expect(desc).toContain("check for existing resources before creating");
    }
  });

  it("every payment_method_tokenization tool description contains [Tokenization] guidance", () => {
    const tokenTools = allTools.filter(
      (t) => getToolCategory(t.name) === "payment_method_tokenization",
    );
    expect(tokenTools.length).toBeGreaterThan(0);

    for (const tool of tokenTools) {
      const desc = getToolDescription(tool);
      expect(desc).toContain("[Tokenization]");
      expect(desc).toContain("sensitive card data");
    }
  });

  it("spreedly_gateway_create description mentions spreedly_gateway_list", () => {
    const tool = allTools.find((t) => t.name === "spreedly_gateway_create");
    expect(tool).toBeDefined();
    const desc = getToolDescription(tool!);
    expect(desc).toContain("spreedly_gateway_list");
  });

  it("always_enabled tool descriptions are NOT enriched with category guidance", () => {
    const enabledTools = allTools.filter(
      (t) => getToolCategory(t.name) === "always_enabled",
    );
    expect(enabledTools.length).toBeGreaterThan(0);

    for (const tool of enabledTools) {
      const desc = getToolDescription(tool);
      expect(desc).not.toContain("[Configuration]");
      expect(desc).not.toContain("[Transaction]");
      expect(desc).not.toContain("[Tokenization]");
    }
  });
});

describe("complete tool coverage", () => {
  it("every tool in allTools has a valid category", () => {
    const validCategories = new Set([
      "payment_method_tokenization",
      "transaction_initiation",
      "administrative",
      "always_enabled",
      "always_disabled",
    ]);

    for (const tool of allTools) {
      const category = getToolCategory(tool.name);
      expect(validCategories.has(category)).toBe(true);
    }
  });

  it("always_enabled tools are included with all flags disabled", () => {
    const enabledTools = filterTools(allTools, ALL_DISABLED);
    expect(enabledTools.length).toBeGreaterThan(0);

    for (const tool of enabledTools) {
      expect(getToolCategory(tool.name)).toBe("always_enabled");
    }
  });

  it("always_disabled tools are excluded even with all flags enabled", () => {
    const enabledTools = filterTools(allTools, ALL_ENABLED);
    const enabledNames = new Set(enabledTools.map((t) => t.name));

    for (const tool of allTools) {
      if (getToolCategory(tool.name) === "always_disabled") {
        expect(enabledNames.has(tool.name)).toBe(false);
      }
    }
  });

  it("all tools from allTools are accounted for across categories", () => {
    const alwaysEnabledCount = allTools.filter(
      (t) => getToolCategory(t.name) === "always_enabled",
    ).length;
    const alwaysDisabledCount = allTools.filter(
      (t) => getToolCategory(t.name) === "always_disabled",
    ).length;
    const tokenizationCount = allTools.filter(
      (t) => getToolCategory(t.name) === "payment_method_tokenization",
    ).length;
    const transactionCount = allTools.filter(
      (t) => getToolCategory(t.name) === "transaction_initiation",
    ).length;
    const adminCount = allTools.filter(
      (t) => getToolCategory(t.name) === "administrative",
    ).length;

    const total =
      alwaysEnabledCount +
      alwaysDisabledCount +
      tokenizationCount +
      transactionCount +
      adminCount;
    expect(total).toBe(allTools.length);
  });
});
