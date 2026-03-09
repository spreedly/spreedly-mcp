import { TOOL_DESCRIPTIONS } from "../../security/descriptions.js";
import type { ToolDefinition } from "../../types/shared.js";
import {
  CreateCertificateSchema,
  GenerateCertificateSchema,
  ListCertificatesSchema,
  UpdateCertificateSchema,
} from "./schemas.js";

function buildQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v!)}`).join("&");
}

export const certificateTools: ToolDefinition[] = [
  {
    name: "spreedly_certificate_create",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_create,
    schema: CreateCertificateSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/certificates.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_certificate_generate",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_generate,
    schema: GenerateCertificateSchema.shape,
    handler: async (params, { transport }) => {
      const res = await transport.request("POST", "/certificates/generate.json", { body: params });
      return res.data;
    },
  },
  {
    name: "spreedly_certificate_list",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_list,
    schema: ListCertificatesSchema.shape,
    handler: async (params, { transport }) => {
      const { since_token } = params as { since_token?: string };
      const query = buildQuery({ since_token });
      const res = await transport.request("GET", `/certificates.json${query}`);
      return res.data;
    },
  },
  {
    name: "spreedly_certificate_update",
    description: TOOL_DESCRIPTIONS.spreedly_certificate_update,
    schema: UpdateCertificateSchema.shape,
    handler: async (params, { transport }) => {
      const { certificate_token, certificate } = params as {
        certificate_token: string;
        certificate: Record<string, unknown>;
      };
      const res = await transport.request("PUT", `/certificates/${certificate_token}.json`, {
        body: { certificate },
      });
      return res.data;
    },
  },
];
