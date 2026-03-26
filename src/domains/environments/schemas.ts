import { z } from "zod";

export const CreateEnvironmentSchema = z
  .object({
    environment: z
      .object({
        name: z
          .string()
          .max(100)
          .describe(
            "Human-readable name for the environment (max 100 chars; must not contain \\ | # $ % { } ; \" < >).",
          ),
        callback_url: z
          .string()
          .url()
          .optional()
          .describe(
            "URL where Spreedly will POST Account Updater transaction results in JSON format.",
          ),
        allow_direct_api_payment_method_creation: z
          .boolean()
          .optional()
          .describe(
            "When `true`, payment methods may be created via the direct API in addition to iFrame/Express. Defaults to `true`.",
          ),
        au_enabled: z
          .boolean()
          .optional()
          .describe("When `true`, cards in this environment are enrolled in Account Updater."),
        payment_method_management_enabled: z
          .boolean()
          .optional()
          .describe("When `true`, the environment is enabled for Advanced Vaulting."),
        iframe_enhanced_security_enabled: z
          .boolean()
          .optional()
          .describe("When `true`, the environment is enabled to pass enhanced security fields to iFrame init."),
      })
      .describe("Environment creation payload"),
  })
  .strict();

export const ListEnvironmentsSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token"),
    count: z.string().optional().describe("Number of environments to return"),
  })
  .strict();

export const ShowEnvironmentSchema = z
  .object({
    environment_key: z.string().describe("The key of the environment"),
  })
  .strict();

export const UpdateEnvironmentSchema = z
  .object({
    environment_key: z.string().describe("The key of the environment to update"),
    environment: z
      .object({
        name: z
          .string()
          .max(100)
          .optional()
          .describe("Updated human-readable name (max 100 chars)."),
        callback_url: z
          .string()
          .url()
          .optional()
          .describe("Updated URL for Account Updater result delivery."),
        allow_direct_api_payment_method_creation: z
          .boolean()
          .optional()
          .describe("Updated direct-API payment method creation permission."),
        au_enabled: z.boolean().optional().describe("Updated Account Updater enrollment flag."),
        payment_method_management_enabled: z
          .boolean()
          .optional()
          .describe("Updated Advanced Vaulting flag."),
        smart_routing_enabled: z
          .boolean()
          .optional()
          .describe("Whether to enable smart routing."),
        default_gateway_token: z
          .string()
          .optional()
          .describe("Default gateway to send transactions if smart routing is enabled"),
        iframe_enhanced_security_enabled: z
          .boolean()
          .optional()
          .describe("When `true`, the environment is enabled to pass enhanced security fields to iFrame init."),
      })
      .describe("Fields to update on the environment"),
  })
  .strict();
