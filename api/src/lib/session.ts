import type { Context } from "hono";
import { sign, verify } from "hono/jwt";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import dayjs from "dayjs";
import { prisma } from "./db.js";
import { CONFIG } from "../config/index.js";
import { authCookies } from "./index.js";

export type AccessSession = {
    userId: string;
    email: string;
    expiresAt: Date;
    rotateAt: Date;
};

export type RefreshSession = {
    sessionId: string;
    userId: string;
    email: string;
    presentedTokenHash: string;
    usedPreviousToken: boolean;
};

type CreateRefreshSessionInput = {
    userId: string;
    userAgent: string | null;
    ipAddr: string | null;
};

type CreateAccessTokenInput = {
    userId: string;
    email: string;
};

type JwtPayload = {
    sub?: unknown;
    email?: unknown;
    exp?: unknown;
};

export const generateToken = (): string => {
    return randomBytes(32).toString("base64url");
};

export const hashToken = (token: string): string => {
    return createHmac("sha256", CONFIG.refreshTokenSecret)
        .update(token)
        .digest("hex");
};

const safeEquals = (left: string, right: string): boolean => {
    const leftBuf = Buffer.from(left, "utf8");
    const rightBuf = Buffer.from(right, "utf8");

    if (leftBuf.byteLength !== rightBuf.byteLength) {
        return false;
    }
    return timingSafeEqual(leftBuf, rightBuf);
};

const calculateRotateAt = (expiresAt: Date): Date => {
    const rotateAt = dayjs(expiresAt).subtract(
        CONFIG.refreshBeforeExpiry,
        "second",
    );
    const now = dayjs();

    if (rotateAt.isAfter(now)) {
        return rotateAt.toDate();
    }

    return now.toDate();
};

export const session = {
    getAccessCookie(c: Context): string | null {
        return authCookies.getAccess(c);
    },

    getRefreshCookie(c: Context): string | null {
        return authCookies.getRefresh(c);
    },

    setAccessCookie(c: Context, token: string, expiresAt: Date): void {
        authCookies.setAccess(c, token, expiresAt);
    },

    setRefreshCookie(c: Context, token: string, expiresAt: Date): void {
        authCookies.setRefresh(c, token, expiresAt);
    },

    clearCookies(c: Context): void {
        authCookies.clearAll(c);
    },

    async createAccessToken(
        input: CreateAccessTokenInput,
    ): Promise<{ token: string; expiresAt: Date; rotateAt: Date }> {
        const now = dayjs();
        const expiresAt = now.add(CONFIG.accessTokenMaxAge, "second").toDate();
        const token = await sign(
            {
                sub: input.userId,
                email: input.email,
                iat: now.unix(),
                exp: dayjs(expiresAt).unix(),
            },
            CONFIG.accessTokenSecret,
            "HS256",
        );

        return {
            token,
            expiresAt,
            rotateAt: calculateRotateAt(expiresAt),
        };
    },

    async resolveAccessToken(token: string): Promise<AccessSession | null> {
        try {
            const payload = (await verify(
                token,
                CONFIG.accessTokenSecret,
                "HS256",
            )) as JwtPayload;

            const userId = typeof payload.sub === "string" ? payload.sub : null;
            const email =
                typeof payload.email === "string" ? payload.email : null;
            const exp = typeof payload.exp === "number" ? payload.exp : null;

            if (!userId || !email || !exp) {
                return null;
            }

            const expiresAt = dayjs.unix(exp).toDate();
            if (!dayjs(expiresAt).isAfter(dayjs())) {
                return null;
            }

            return {
                userId,
                email,
                expiresAt,
                rotateAt: calculateRotateAt(expiresAt),
            };
        } catch {
            return null;
        }
    },

    async createRefreshSession(
        input: CreateRefreshSessionInput,
    ): Promise<{ token: string; expiresAt: Date }> {
        const token = generateToken();
        const tokenHash = hashToken(token);

        const now = dayjs();
        const expiresAt = now.add(CONFIG.refreshTokenMaxAge, "second");

        await prisma.user_sessions.create({
            data: {
                user_id: input.userId,
                token_hash: tokenHash,
                expires_at: expiresAt.toDate(),
                agent: input.userAgent,
                ip: input.ipAddr,
            },
        });

        return {
            token,
            expiresAt: expiresAt.toDate(),
        };
    },

    async resolveRefreshSession(token: string): Promise<RefreshSession | null> {
        const tokenHash = hashToken(token);
        const now = dayjs();
        const nowDate = now.toDate();

        const row = await prisma.user_sessions.findFirst({
            where: {
                expires_at: {
                    gt: nowDate,
                },
                OR: [
                    { token_hash: tokenHash },
                    { previous_token_hash: tokenHash },
                ],
            },
            include: {
                user: true,
            },
        });

        if (!row || !row.user.is_active) {
            return null;
        }

        const matchesActiveToken = safeEquals(row.token_hash, tokenHash);
        const matchesPreviousToken =
            !!row.previous_token_hash &&
            safeEquals(row.previous_token_hash, tokenHash);

        if (!matchesActiveToken && !matchesPreviousToken) {
            return null;
        }

        if (matchesPreviousToken) {
            const graceUntil = row.grace_until;
            if (!graceUntil || !dayjs(graceUntil).isAfter(now)) {
                return null;
            }
        }

        return {
            sessionId: row.id,
            userId: row.user_id,
            email: row.user.email,
            presentedTokenHash: tokenHash,
            usedPreviousToken: matchesPreviousToken,
        };
    },

    async rotateRefreshSession(
        sessionId: string,
        presentedTokenHash: string,
    ): Promise<{ token: string; expiresAt: Date } | null> {
        const now = dayjs();
        const nowDate = now.toDate();
        const nextToken = generateToken();
        const nextTokenHash = hashToken(nextToken);
        const nextExpiresAt = now
            .add(CONFIG.refreshTokenMaxAge, "second")
            .toDate();
        const graceUntil = now
            .add(CONFIG.refreshGraceWindow, "second")
            .toDate();

        const { count } = await prisma.user_sessions.updateMany({
            where: {
                id: sessionId,
                token_hash: presentedTokenHash,
                expires_at: {
                    gt: nowDate,
                },
            },
            data: {
                previous_token_hash: presentedTokenHash,
                token_hash: nextTokenHash,
                grace_until: graceUntil,
                expires_at: nextExpiresAt,
            },
        });

        if (count !== 1) {
            return null;
        }

        return {
            token: nextToken,
            expiresAt: nextExpiresAt,
        };
    },
};
