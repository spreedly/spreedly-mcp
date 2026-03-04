import { z } from "zod";

export const CreateEnvironmentSchema = z.object({
  environment: z.object({
    name: z.string().describe("Name for the new environment"),
  }),
}).strict();

export const ListEnvironmentsSchema = z.object({
  since_token: z.string().optional().describe("Pagination token"),
}).strict();

export const ShowEnvironmentSchema = z.object({
  environment_key: z.string().describe("The key of the environment"),
}).strict();

export const UpdateEnvironmentSchema = z.object({
  environment_key: z.string().describe("The key of the environment to update"),
  environment: z.object({
    name: z.string().optional().describe("Updated environment name"),
  }),
}).strict();

export const CreateAccessSecretSchema = z.object({
  environment_key: z.string().describe("The key of the environment"),
}).strict();

export const ListAccessSecretsSchema = z.object({
  environment_key: z.string().describe("The key of the environment"),
}).strict();

export const ShowAccessSecretSchema = z.object({
  environment_key: z.string().describe("The key of the environment"),
  access_secret_key: z.string().describe("The key of the access secret"),
}).strict();

export const DeleteAccessSecretSchema = z.object({
  environment_key: z.string().describe("The key of the environment"),
  access_secret_key: z.string().describe("The key of the access secret to delete"),
}).strict();

export const RegenerateSigningSecretSchema = z.object({
  environment_key: z.string().describe("The key of the environment"),
}).strict();
