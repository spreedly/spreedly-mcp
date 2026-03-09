import type { ToolDefinition } from "../types/shared.js";

export type ToolCategory =
  | "payment_method_tokenization"
  | "transaction_initiation"
  | "administrative"
  | "always_enabled"
  | "always_disabled";

export interface ToolPolicyConfig {
  paymentMethodTokenizationEnabled: boolean;
  transactionInitiationEnabled: boolean;
  administrativeEnabled: boolean;
}

const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  // --- payment_method_tokenization ---
  spreedly_payment_method_create: "payment_method_tokenization",
  spreedly_payment_method_recache: "payment_method_tokenization",

  // --- transaction_initiation ---
  spreedly_gateway_authorize: "transaction_initiation",
  spreedly_gateway_purchase: "transaction_initiation",
  spreedly_gateway_verify: "transaction_initiation",
  spreedly_gateway_store: "transaction_initiation",
  spreedly_gateway_general_credit: "transaction_initiation",
  spreedly_transaction_capture: "transaction_initiation",
  spreedly_transaction_void: "transaction_initiation",
  spreedly_transaction_credit: "transaction_initiation",
  spreedly_transaction_complete: "transaction_initiation",
  spreedly_transaction_confirm: "transaction_initiation",
  spreedly_sca_authenticate: "transaction_initiation",
  spreedly_protection_create_provider: "transaction_initiation",
  spreedly_protection_forward_claim: "transaction_initiation",
  spreedly_card_refresher_inquiry: "transaction_initiation",

  // --- administrative ---
  spreedly_gateway_create: "administrative",
  spreedly_gateway_update: "administrative",
  spreedly_gateway_retain: "administrative",
  spreedly_certificate_create: "administrative",
  spreedly_certificate_list: "administrative",
  spreedly_certificate_generate: "administrative",
  spreedly_certificate_update: "administrative",
  spreedly_environment_create: "administrative",
  spreedly_environment_list: "administrative",
  spreedly_environment_show: "administrative",
  spreedly_environment_update: "administrative",
  spreedly_sub_merchant_create: "administrative",
  spreedly_sub_merchant_update: "administrative",
  spreedly_sca_create_provider: "administrative",
  spreedly_merchant_profile_create: "administrative",
  spreedly_merchant_profile_update: "administrative",

  // --- always_disabled ---
  spreedly_receiver_list_supported: "always_disabled",
  spreedly_receiver_create: "always_disabled",
  spreedly_receiver_list: "always_disabled",
  spreedly_receiver_show: "always_disabled",
  spreedly_receiver_update: "always_disabled",
  spreedly_receiver_redact: "always_disabled",
  spreedly_receiver_deliver: "always_disabled",
  spreedly_receiver_export: "always_disabled",
  spreedly_environment_create_access_secret: "always_disabled",
  spreedly_environment_list_access_secrets: "always_disabled",
  spreedly_environment_show_access_secret: "always_disabled",
  spreedly_environment_delete_access_secret: "always_disabled",
  spreedly_environment_regenerate_signing_secret: "always_disabled",
  spreedly_transaction_authorize_workflow: "always_disabled",
  spreedly_transaction_purchase_workflow: "always_disabled",
  spreedly_transaction_verify_workflow: "always_disabled",
  spreedly_payment_method_redact: "always_disabled",
  spreedly_gateway_redact: "always_disabled",
};

export const CATEGORY_GUIDANCE: Record<ToolCategory, string> = {
  administrative:
    "[Configuration] This is a setup operation for a long-lived resource. Always use the corresponding list/show tool to check for existing resources before creating new ones. Do not recreate configuration objects for each transaction.",
  transaction_initiation:
    "[Transaction] This is a per-transaction operation. Before using any token, verify it is the right resource for this specific operation. Never assume a token from a previous operation applies here -- confirm the gateway, merchant, and payment method all match the current context.",
  payment_method_tokenization:
    "[Tokenization] This operation handles sensitive card data (PAN/CVV). Only use when the merchant has explicitly enabled payment method tokenization.",
  always_enabled: "",
  always_disabled: "",
};

export function getToolCategory(toolName: string): ToolCategory {
  return TOOL_CATEGORIES[toolName] ?? "always_enabled";
}

export function isToolEnabled(
  toolName: string,
  config: ToolPolicyConfig,
): boolean {
  const category = getToolCategory(toolName);
  switch (category) {
    case "always_enabled":
      return true;
    case "always_disabled":
      return false;
    case "payment_method_tokenization":
      return config.paymentMethodTokenizationEnabled;
    case "transaction_initiation":
      return config.transactionInitiationEnabled;
    case "administrative":
      return config.administrativeEnabled;
  }
}

export function filterTools(
  tools: ToolDefinition[],
  config: ToolPolicyConfig,
): ToolDefinition[] {
  return tools.filter((tool) => isToolEnabled(tool.name, config));
}

export function getToolDescription(tool: ToolDefinition): string {
  const category = getToolCategory(tool.name);
  const suffix = CATEGORY_GUIDANCE[category];
  if (!suffix) return tool.description;
  return `${tool.description} ${suffix}`;
}

export function parseBoolEnv(value: unknown): boolean {
  if (value === true) return true;
  if (typeof value === "string") return value.toLowerCase() === "true";
  return false;
}

export function readPolicyFromEnv(): ToolPolicyConfig {
  return {
    paymentMethodTokenizationEnabled: parseBoolEnv(
      process.env.PAYMENT_METHOD_TOKENIZATION_ENABLED,
    ),
    transactionInitiationEnabled: parseBoolEnv(
      process.env.TRANSACTION_INITIATION_ENABLED,
    ),
    administrativeEnabled: parseBoolEnv(process.env.ADMINISTRATIVE_ENABLED),
  };
}

export function getEnabledCategories(config: ToolPolicyConfig): string[] {
  const categories: string[] = ["always_enabled"];
  if (config.paymentMethodTokenizationEnabled)
    categories.push("payment_method_tokenization");
  if (config.transactionInitiationEnabled)
    categories.push("transaction_initiation");
  if (config.administrativeEnabled) categories.push("administrative");
  return categories;
}
