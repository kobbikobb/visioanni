import { Hono } from "hono";

export const goalsRoute = new Hono()
    .get("/", (c) => {
        return c.json({ goals: [] });
    })
    .post("/", (c) => {
        return c.json({});
    });
