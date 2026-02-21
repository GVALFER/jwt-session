import { CONFIG } from "@/src/config";
import ky, { type BeforeErrorHook, type HTTPError, type KyInstance } from "ky";
import {
    isAuthRoute,
    isMaintenanceStatus,
    maintenancePath,
} from "./authRouting";
import { parseError } from "./parseError";

type KyError = HTTPError & { status?: number; code?: string };

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

const isNetworkError = (error: HTTPError): boolean => {
    if (error.response) return false;
    const msg = error.message ?? "";
    return (
        msg.includes("fetch failed") ||
        msg.includes("ECONNREFUSED") ||
        msg.includes("network")
    );
};

export const buildHeaders = (target: Headers, incoming: Headers): void => {
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

const beforeRequest = async (request: Request) => {
    if (CONFIG.isBrowser) return;

    const { headers: getHeaders } = await import("next/headers");
    const incoming = await getHeaders();

    buildHeaders(request.headers, incoming);
};

const afterResponse = async (
    request: Request,
    _options: unknown,
    response: Response,
    state: { retryCount: number },
) => {
    if (!CONFIG.isBrowser) return response;

    const pathname = window.location.pathname;

    if (isMaintenanceStatus(response.status)) {
        if (pathname !== "/maintenance") {
            window.location.replace(maintenancePath(response.status));
        }
        return response;
    }

    if (response.status === 403 && !isAuthRoute(request.url)) {
        if (pathname === "/login" || pathname === "/maintenance") {
            return response;
        }

        if (state.retryCount > 0) {
            return response;
        }

        try {
            await ky.post(`${CONFIG.browserUrl}/auth/refresh`, {
                credentials: "include",
                cache: "no-store",
            });

            return ky.retry();
        } catch (error) {
            const status = parseError(error).status;

            if (isMaintenanceStatus(status)) {
                window.location.replace(maintenancePath(status));
            } else {
                window.location.replace("/login");
            }

            return response;
        }
    }

    return response;
};

const formatError: BeforeErrorHook = async (error) => {
    if (CONFIG.isBrowser && isNetworkError(error)) {
        window.location.replace(maintenancePath(503));
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

export const api: KyInstance = ky.create({
    prefixUrl: CONFIG.apiBase,
    credentials: CONFIG.isBrowser ? "include" : undefined,
    timeout: 90_000,
    retry: {
        limit: 1,
        shouldRetry: () => false,
    },
    hooks: {
        beforeRequest: [beforeRequest],
        afterResponse: [afterResponse],
        beforeError: [formatError],
    },
});
