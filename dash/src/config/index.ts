type RuntimeConfig = {
    browserUrl: string;
    internalUrl: string;
    accessCookieName: string;
    refreshCookieName: string;
    apiBase: string;
    isBrowser: boolean;
};

const stripSlash = (value: string): string => {
    return value.endsWith("/") ? value.slice(0, -1) : value;
};

const isBrowser = typeof window !== "undefined";
const browserUrl = stripSlash(process.env.NEXT_PUBLIC_API_BASE ?? "");
const internalUrl = stripSlash(process.env.API_INTERNAL_URL ?? "");

export const CONFIG: RuntimeConfig = {
    browserUrl,
    internalUrl,
    accessCookieName: "__acc",
    refreshCookieName: "__ref",
    apiBase: isBrowser ? browserUrl : internalUrl,
    isBrowser,
};
