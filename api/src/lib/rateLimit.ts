import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";
import { getClientInfo } from "./clientInfo.js";

const buildKey = (rawPath: string, ip: string | null): string => {
    return `${rawPath}:${ip ?? "unknown"}`;
};

export const createRateLimit = (
    maxRequests: number,
    windowMs: number,
): MiddlewareHandler => {
    return rateLimiter({
        windowMs,
        limit: maxRequests,
        standardHeaders: "draft-7",
        keyGenerator: (c) => {
            const ip = getClientInfo(c).ip;
            return buildKey(c.req.path, ip);
        },
        message: {
            code: "TOO_MANY_REQUESTS",
            error: "Too many requests, please try again later.",
        },
    });
};

export const loginRateLimit: MiddlewareHandler = createRateLimit(10, 60_000);
export const registerRateLimit: MiddlewareHandler = createRateLimit(5, 60_000);
export const refreshRateLimit: MiddlewareHandler = createRateLimit(30, 60_000);
