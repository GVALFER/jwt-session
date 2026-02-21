import type { Context } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import dayjs from "dayjs";
import { CONFIG, isProd } from "../config/index.js";

const resolveCookieName = (baseName: string): string => {
    const base = baseName.trim() || "session";
    if (!isProd()) return base;

    return base.startsWith("__Host-") ? base : `__Host-${base}`;
};

const ACCESS_COOKIE_NAME = resolveCookieName(CONFIG.accessCookieName);
const REFRESH_COOKIE_NAME = resolveCookieName(CONFIG.refreshCookieName);

const readCookie = (c: Context, name: string): string | null => {
    const raw = getCookie(c, name)?.trim();
    return raw && raw.length > 0 ? raw : null;
};

const setAuthCookie = (
    c: Context,
    name: string,
    value: string,
    expiresAt: Date,
): void => {
    const maxAge = Math.max(1, dayjs(expiresAt).diff(dayjs(), "second"));

    setCookie(c, name, value, {
        httpOnly: true,
        secure: isProd(),
        sameSite: "Lax",
        path: "/",
        maxAge,
    });
};

const clearCookie = (c: Context, name: string): void => {
    setCookie(c, name, "", {
        httpOnly: true,
        secure: isProd(),
        sameSite: "Lax",
        path: "/",
        maxAge: 0,
        expires: new Date(0),
    });
};

export const authCookies = {
    getAccess(c: Context): string | null {
        return readCookie(c, ACCESS_COOKIE_NAME);
    },

    getRefresh(c: Context): string | null {
        return readCookie(c, REFRESH_COOKIE_NAME);
    },

    setAccess(c: Context, token: string, expiresAt: Date): void {
        setAuthCookie(c, ACCESS_COOKIE_NAME, token, expiresAt);
    },

    setRefresh(c: Context, token: string, expiresAt: Date): void {
        setAuthCookie(c, REFRESH_COOKIE_NAME, token, expiresAt);
    },

    clearAll(c: Context): void {
        clearCookie(c, ACCESS_COOKIE_NAME);
        clearCookie(c, REFRESH_COOKIE_NAME);
    },
};
