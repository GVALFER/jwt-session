import { Hono } from "hono";
import {
    Err,
    getClientInfo,
    refreshRateLimit,
    session,
} from "../../lib/index.js";

const app = new Hono();

app.post("/", refreshRateLimit, async (c) => {
    const token = session.getRefreshCookie(c);

    if (!token) {
        throw Err("Forbidden", 403);
    }

    const resolved = await session.resolveRefreshSession(token);

    if (!resolved) {
        session.clearCookies(c);
        throw Err("Forbidden", 403);
    }

    let active = resolved;

    if (!resolved.usedPreviousToken) {
        const rotated = await session.rotateRefreshSession(
            resolved.sessionId,
            resolved.presentedTokenHash,
        );

        if (rotated) {
            session.setRefreshCookie(c, rotated.token, rotated.expiresAt);
        } else {
            const fallback = await session.resolveRefreshSession(token);
            if (!fallback || !fallback.usedPreviousToken) {
                session.clearCookies(c);
                throw Err("Forbidden", 403);
            }

            active = fallback;
        }
    }

    const client = getClientInfo(c);

    const access = await session.createAccessToken({
        userId: active.userId,
        email: active.email,
        ipAddr: client.ip,
        userAgent: client.userAgent,
    });

    session.setAccessCookie(c, access.token, access.expiresAt);

    return c.body(null, 204);
});

export default app;
