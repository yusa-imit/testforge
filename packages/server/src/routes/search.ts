import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { getDB } from "../db";

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const app = new Hono().get(
  "/",
  zValidator("query", searchQuerySchema),
  async (c) => {
    const { q, limit } = c.req.valid("query");
    const db = await getDB();
    const results = await db.searchEntities(q, limit);
    return c.json({ data: results });
  }
);

export type SearchRoute = typeof app;
export default app;
