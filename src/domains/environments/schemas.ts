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
    environment: z.object({
      name: z.string().optional().describe("Updated environment name"),
    }),
  })
  .strict();
