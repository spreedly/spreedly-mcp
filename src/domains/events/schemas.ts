import { z } from "zod";

export const ListEventsSchema = z
  .object({
    order: z.enum(["asc", "desc"]).optional().describe("Sort order"),
    since_token: z.string().optional().describe("Pagination token to fetch events after"),
    count: z.string().optional().describe("Number of events to return"),
    event_type: z.string().optional().describe("Event types to return"),
  })
  .strict();

export const ShowEventSchema = z
  .object({
    event_id: z.string().describe("The ID of the event to retrieve"),
  })
  .strict();
