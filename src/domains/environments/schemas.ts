import { z } from "zod";

export const CreateEnvironmentSchema = z
  .object({
    environment: z.object({
      name: z.string().describe("Name for the new environment"),
    }),
  })
  .strict();

export const ListEnvironmentsSchema = z
  .object({
    since_token: z.string().optional().describe("Pagination token"),
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
    environment: z.object({
      name: z.string().optional().describe("Updated environment name"),
    }),
  })
  .strict();
