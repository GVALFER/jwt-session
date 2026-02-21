import { Hono } from "hono";
import * as v from "valibot";
import dayjs from "dayjs";
import {
    Err,
    getClientInfo,
    loginRateLimit,
    prisma,
    session,
    validator,
    verifyPassword,
} from "../../lib/index.js";

const app = new Hono();

const schema = validator(
    "json",
    v.strictObject({
        email: v.pipe(v.string(), v.email()),
        password: v.pipe(v.string(), v.minLength(1), v.maxLength(512)),
    }),
);

app.post("/", loginRateLimit, schema, async (c) => {
    const payload = c.req.valid("json");
    const email = payload.email.trim().toLowerCase();

    const user = await prisma.users.findUnique({
        where: {
            email,
        },
    });

    const isValidPassword = await verifyPassword(
        payload.password,
        user?.password_hash,
    );

    if (!user || !user.is_active || !isValidPassword) {
        throw Err("Invalid credentials", 401);
    }

    const client = getClientInfo(c);
    const created = await session.createRefreshSession({
        userId: user.id,
        userAgent: client.userAgent,
        ipAddr: client.ip,
    });

    const access = await session.createAccessToken({
        userId: user.id,
        email: user.email,
        ipAddr: client.ip,
        userAgent: client.userAgent,
    });

    await prisma.users.update({
        where: {
            id: user.id,
        },
        data: {
            last_login_at: dayjs().toDate(),
        },
    });

    session.setRefreshCookie(c, created.token, created.expiresAt);
    session.setAccessCookie(c, access.token, access.expiresAt);

    return c.json(
        {
            session: {
                expiresAt: access.expiresAt,
                rotateAt: access.rotateAt,
            },
        },
        200,
    );
});

export default app;
