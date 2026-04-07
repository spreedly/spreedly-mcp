import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import { buildUrl } from "../../transport/path.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateCertificateSchema,
  GenerateCertificateSchema,
  ListCertificatesSchema,
  UpdateCertificateSchema,
} from "./schemas.js";

export const certificateTools: ToolDefinition[] = [
  {
    name: "spreedly_certificate_create",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_create,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: CreateCertificateSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/certificates.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_certificate_generate",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_generate,
    annotations: { destructiveHint: false, idempotentHint: false, openWorldHint: false },
    schema: GenerateCertificateSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/certificates/generate.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_certificate_list",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_list,
    annotations: { readOnlyHint: true, openWorldHint: false },
    schema: ListCertificatesSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token, order } = params as { since_token?: string; order?: string };
      const res = await transport.request(
        "GET",
        buildUrl("/certificates.json", { query: { since_token, order } }),
      );
      return res.data;
    },
  },
  {
    name: "spreedly_certificate_update",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_update,
    annotations: { destructiveHint: true, idempotentHint: true, openWorldHint: false },
    schema: UpdateCertificateSchema.shape,
    handler: async (params, { transport }) => {
      const { certificate_token, certificate } = params as {
        certificate_token: string;
        certificate: Record<string, unknown>;
      };
      const res = await transport.request(
        "PUT",
        buildUrl("/certificates/:certificate_token.json", { path: { certificate_token } }),
        {
          body: { certificate },
        },
      );
      return res.data;
    },
  },
];
