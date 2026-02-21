import { Hono } from "hono";
import { type AppEnv, authGuard, prisma, session } from "../../lib/index.js";
import dayjs from "dayjs";

const app = new Hono<AppEnv>();

app.post("/", authGuard, async (c) => {
    const user = c.get("user");

    const now = dayjs().toDate();

    await prisma.user_sessions.updateMany({
        where: {
            user_id: user.userId,
        },
        data: {
            expires_at: now,
        },
    });

    session.clearCookies(c);

    return c.json({ message: "User logged out successfully" }, 200);
});

export default app;
