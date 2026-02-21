export const PUBLIC_PREFIXES = ["/login", "/register", "/maintenance"];
export const PRIVATE_PREFIXES = ["/dashboard"];

export const AUTH_API_PATHS = [
    "auth/login",
    "auth/register",
    "auth/refresh",
] as const;

export const isPrivateRoute = (pathname: string): boolean => {
    return PRIVATE_PREFIXES.some((prefix) => {
        return pathname === prefix || pathname.startsWith(`${prefix}/`);
    });
};

export const isAuthRoute = (url: string): boolean => {
    return AUTH_API_PATHS.some((path) => url.includes(path));
};

export const isMaintenanceStatus = (status: number): boolean => {
    return status === 429 || status >= 500;
};

export const maintenancePath = (status: number): string => {
    return `/maintenance?status=${status}`;
};
