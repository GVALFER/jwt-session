import { Hono } from "hono";
import { hashToken, prisma, session } from "../../lib/index.js";
import dayjs from "dayjs";

const app = new Hono();

app.post("/", async (c) => {
    const token = session.getRefreshCookie(c);

    if (token) {
        const tokenHash = hashToken(token);
        const now = dayjs().toDate();

        await prisma.user_sessions.updateMany({
            where: {
                OR: [
                    { token_hash: tokenHash },
                    { previous_token_hash: tokenHash },
                ],
            },
            data: {
                expires_at: now,
            },
        });
    }

    session.clearCookies(c);

    return c.json({ message: "User logged out successfully" }, 200);
});

export default app;
