import type { NextRequest } from "next/server";
import { CONFIG } from "@/src/config";
import { buildHeaders } from "./api";

const API_BASE = (CONFIG.internalUrl ?? "").replace(/\/+$/, "");

export const decodeJwtExp = (
    token: string | null | undefined,
): number | null => {
    try {
        if (!token) return null;

        const parts = token.split(".");
        if (parts.length !== 3) return null;

        const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
        const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);

        const payload = JSON.parse(atob(padded));
        return typeof payload.exp === "number" ? payload.exp : null;
    } catch {
        return null;
    }
};

const extractCookies = (headers: Headers): string[] => {
    const headersWithCookieList = headers as Headers & {
        getSetCookie?: () => string[];
    };

    if (typeof headersWithCookieList.getSetCookie === "function") {
        return headersWithCookieList.getSetCookie();
    }

    const cookie = headers.get("set-cookie");
    return cookie ? [cookie] : [];
};

export const refreshSession = async (request: NextRequest) => {
    if (!API_BASE) {
        return {
            status: 503,
            cookies: [] as string[],
        };
    }

    try {
        const headers = new Headers();
        buildHeaders(headers, request.headers);

        const response = await fetch(`${API_BASE}/auth/refresh`, {
            method: "POST",
            headers,
            cache: "no-store",
        });

        return {
            status: response.status,
            cookies: extractCookies(response.headers),
        };
    } catch {
        return {
            status: 503,
            cookies: [] as string[],
        };
    }
};
