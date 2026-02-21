import ky, { BeforeErrorHook, HTTPError } from "ky";
import {
    isAuthRoute,
    isMaintenanceStatus,
    maintenancePath,
} from "./authRouting";
import { parseError } from "./parseError";
import { CONFIG } from "../config";

type KyError = HTTPError & { status?: number; code?: string };
type RefreshResult = { ok: boolean; status: number };

export const FORWARDED_HEADERS = [
    "cookie",
    "origin",
    "host",
    "referer",
    "user-agent",
    "accept-language",
    "sec-ch-ua",
    "sec-ch-ua-platform",
    "sec-ch-ua-mobile",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-port",
    "cf-connecting-ip",
    "x-forwarded-for",
    "x-real-ip",
    "cf-ray",
    "x-request-id",
] as const;

const isBrowser = typeof window !== "undefined";

let refreshed: Promise<RefreshResult> | null = null;
let hasRedirected = false;

const redirectOnce = (to: string): void => {
    if (hasRedirected) return;

    hasRedirected = true;
    window.location.replace(to);
};

const refreshSession = async (): Promise<RefreshResult> => {
    if (!refreshed) {
        refreshed = ky
            .post(`${CONFIG.browserUrl}/auth/refresh`, {
                credentials: "include",
                cache: "no-store",
                throwHttpErrors: false,
                retry: { limit: 0 },
            })
            .then((response) => ({
                ok: response.status >= 200 && response.status < 300,
                status: response.status,
            }))
            .catch((error) => ({
                ok: false,
                status: parseError(error).status,
            }))
            .finally(() => {
                refreshed = null;
            });
    }
    return refreshed;
};

export const isNetworkError = (error: HTTPError): boolean => {
    if (error.response) return false;

    const msg = error.message ?? "";
    return (
        msg.includes("fetch failed") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("network")
    );
};

export const buildHeaders = (target: Headers, incoming: Headers) => {
    for (const name of FORWARDED_HEADERS) {
        const value = incoming.get(name);
        if (value) target.set(name, value);
    }

    if (!target.get("origin")) {
        const proto = incoming.get("x-forwarded-proto") ?? "http";
        const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
        if (host) target.set("origin", `${proto}://${host}`);
    }

    if (!target.get("x-forwarded-host")) {
        const host = incoming.get("x-forwarded-host") ?? incoming.get("host");
        if (host) target.set("x-forwarded-host", host);
    }
};

export const beforeRequest = async (request: Request) => {
    if (isBrowser) return;

    const { headers: getHeaders } = await import("next/headers");
    const incoming = await getHeaders();
    buildHeaders(request.headers, incoming);
};

export const afterResponse = async (
    request: Request,
    _opts: unknown,
    response: Response,
    state: { retryCount: number },
) => {
    if (!isBrowser) return response;
    const pathname = window.location.pathname;

    // 429 / 5xx => maintenance
    if (isMaintenanceStatus(response.status)) {
        if (pathname !== "/maintenance") {
            redirectOnce(maintenancePath(response.status));
        }
        return response;
    }

    // 403 => login / refresh
    if (response.status === 403 && !isAuthRoute(request.url)) {
        if (pathname === "/login" || pathname === "/maintenance") {
            return response;
        }

        // Avoid loop of refresh in retries of own ky
        if (state.retryCount > 0) {
            return response;
        }

        const refreshed = await refreshSession();

        if (refreshed.ok) {
            return ky.retry();
        }

        if (isMaintenanceStatus(refreshed.status)) {
            redirectOnce(maintenancePath(refreshed.status));
        } else {
            redirectOnce("/login");
        }

        return response;
    }
    return response;
};

export const formatError: BeforeErrorHook = async (error) => {
    if (isBrowser && isNetworkError(error)) {
        window.location.href = "/maintenance";
        return error;
    }

    const body = await error.response
        ?.clone()
        .json()
        .catch(() => null);

    error.message = body?.error ?? body?.message ?? error.message;
    (error as KyError).status = error.response?.status ?? 503;
    (error as KyError).code = body?.code ?? undefined;

    return error;
};
