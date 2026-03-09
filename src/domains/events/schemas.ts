import { z } from "zod";

export const ListEventsSchema = z
  .object({
    since_token: z.string().optional().describe("Pagination token to fetch events after"),
  })
  .strict();

export const ShowEventSchema = z
  .object({
    event_id: z.string().describe("The ID of the event to retrieve"),
  })
  .strict();
