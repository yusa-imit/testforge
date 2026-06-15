import { Hono } from "hono";
import { getDB } from "../db";

const app = new Hono().get("/", async (c) => {
  const db = await getDB();
  const tags = await db.getAllTags();
  return c.json({ data: tags });
});

export type TagsRoute = typeof app;
export default app;
