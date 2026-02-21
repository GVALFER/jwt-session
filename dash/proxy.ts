import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { CONFIG } from "./src/config";
import {
    ROUTES,
    isMaintenanceStatus,
    isPrivateRoute,
    maintenancePath,
} from "./src/lib/authRouting";
import { decodeJwtExp, refreshSession } from "./src/lib/refreshSession";

const resolveCookieName = (name: string): string => {
    const base = name.trim();

    if (process.env.NODE_ENV !== "production") {
        return base;
    }

    return base.startsWith("__Host-") ? base : `__Host-${base}`;
};

const ACCESS_COOKIE = resolveCookieName(CONFIG.accessCookieName);
const REFRESH_COOKIE = resolveCookieName(CONFIG.refreshCookieName);

const proxy = async (request: NextRequest) => {
    const pathname = request.nextUrl.pathname;

    if (!isPrivateRoute(pathname)) {
        return NextResponse.next();
    }

    const accessToken = request.cookies.get(ACCESS_COOKIE)?.value ?? null;
    const hasRefresh = !!request.cookies.get(REFRESH_COOKIE)?.value;
    const exp = decodeJwtExp(accessToken);
    const now = Math.floor(Date.now() / 1000);
    const isExpired = !exp || now >= exp - 5;

    if (isExpired && hasRefresh) {
        const { status, cookies } = await refreshSession(request);

        if (status >= 200 && status < 300 && cookies.length > 0) {
            const response = NextResponse.redirect(request.nextUrl);
            for (const cookie of cookies) {
                response.headers.append("set-cookie", cookie);
            }
            return response;
        }

        const response = isMaintenanceStatus(status)
            ? NextResponse.redirect(
                  new URL(maintenancePath(status), request.nextUrl),
              )
            : NextResponse.redirect(new URL("/login", request.nextUrl));

        for (const cookie of cookies) {
            response.headers.append("set-cookie", cookie);
        }

        return response;
    }

    if (isExpired) {
        return NextResponse.redirect(new URL("/login", request.nextUrl));
    }

    return NextResponse.next();
};

export default proxy;

export const config = {
    matcher: [
        "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)",
    ],
};
