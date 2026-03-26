import { z } from "zod";

export const CreateCertificateSchema = z
  .object({
    certificate: z
      .object({
        pem: z
          .string()
          .describe(
            "The signed certificate in PEM format. Required when uploading a certificate signed by an external CA.",
          ),
        private_key: z
          .string()
          .optional()
          .describe(
            "The certificate's RSA or EC private key in non-password-protected PEM format.",
          ),
        level: z
          .enum(["environment", "organization"])
          .optional()
          .describe(
            "Scope of the certificate. `environment` (default) restricts to this environment; `organization` shares across all environments in the organization.",
          ),
      })
      .describe("Certificate creation payload"),
  })
  .strict();

export const GenerateCertificateSchema = z
  .object({
    certificate: z
      .object({
        algorithm: z
          .enum(["ec-prime256v1", "rsa-2048"])
          .describe(
            "The encryption algorithm for the generated key pair. `ec-prime256v1` is the X9.62/SECG P-256 curve; `rsa-2048` is a 2048-bit RSA key.",
          ),
        cn: z
          .string()
          .describe(
            "The certificate common name (CN), e.g., 'MyApp ApplePay Production Certificate'.",
          ),
        o: z.string().optional().describe("The organization name (O field in the CSR)."),
        ou: z.string().optional().describe("The organizational unit (OU field in the CSR)."),
        c: z.string().optional().describe("The country code (C field in the CSR), e.g., 'US'."),
        st: z
          .string()
          .optional()
          .describe("The state or province (ST field in the CSR), e.g., 'NC'."),
        l: z
          .string()
          .optional()
          .describe("The locality or city (L field in the CSR), e.g., 'Durham'."),
        email_address: z
          .string()
          .optional()
          .describe("The email address to embed in the CSR subject."),
      })
      .describe("Certificate generation parameters. `algorithm` and `cn` are required."),
  })
  .strict();

export const ListCertificatesSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token"),
  })
  .strict();

export const UpdateCertificateSchema = z
  .object({
    certificate_token: z.string().describe("The token of the certificate to update"),
    certificate: z.object({
      pem: z.string().optional().describe("Updated PEM-encoded certificate content"),
    }),
  })
  .strict();