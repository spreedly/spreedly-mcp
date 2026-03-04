import { z } from "zod";

export const CreateCertificateSchema = z.object({
  certificate: z.object({
    pem: z.string().optional().describe("PEM-encoded certificate content"),
  }).optional(),
}).strict();

export const GenerateCertificateSchema = z.object({
  certificate: z.object({
    algorithm: z.string().optional().describe("Certificate algorithm (e.g., 'RSA', 'EC')"),
    cn: z.string().optional().describe("Common name for the certificate"),
  }).optional(),
}).strict();

export const ListCertificatesSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
}).strict();

export const UpdateCertificateSchema = z.object({
  certificate_token: z.string().describe("The token of the certificate to update"),
  certificate: z.object({
    pem: z.string().optional().describe("Updated PEM-encoded certificate content"),
  }),
}).strict();
