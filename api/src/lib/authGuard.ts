import type { Context, MiddlewareHandler, Next } from 'hono';
import { getClientInfo } from './clientInfo.js';
import { Err } from './errorHandler.js';
import { session } from './session.js';

export type UserData = {
    userId: string;
    email: string;
};

export type SessionData = {
    expiresAt: Date;
    rotateAt: Date;
};

export type AppEnv = {
    Variables: {
        user: UserData;
        session: SessionData;
    };
};

export const authGuard: MiddlewareHandler<AppEnv> = async (
    c: Context,
    next: Next,
) => {
    const token = session.getAccessCookie(c);

    if (!token) {
        throw Err('Forbidden', 403);
    }

    const client = getClientInfo(c);

    const resolved = await session.resolveAccessToken(token, {
        ipAddr: client.ip,
        userAgent: client.userAgent,
    });

    if (!resolved) {
        throw Err('Forbidden', 403);
    }

    c.set('user', {
        userId: resolved.userId,
        email: resolved.email,
    });

    c.set('session', {
        expiresAt: resolved.expiresAt,
        rotateAt: resolved.rotateAt,
    });

    await next();
};
