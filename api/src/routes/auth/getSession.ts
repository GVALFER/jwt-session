import { Hono } from "hono";
import { type AppEnv, authGuard } from "../../lib/index.js";

const app = new Hono<AppEnv>();

app.get("/", authGuard, async (c) => {
    const user = c.get("user");
    const session = c.get("session");

    return c.json({ user, session }, 200);
});

export default app;
