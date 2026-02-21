type RuntimeConfig = {
    port: number;
    dbUrl: URL;
    appOrigin: string | null;
    corsOrigin: string | null;
    refreshTokenSecret: string;
    accessTokenSecret: string;
    accessCookieName: string;
    refreshCookieName: string;
    accessTokenMaxAge: number;
    refreshTokenMaxAge: number;
    refreshGraceWindow: number;
    refreshBeforeExpiry: number;
    ip_validation: boolean;
    agent_validation: boolean;
};

export const isProd = (): boolean => {
    return process.env.NODE_ENV === "production";
};

const dbUrlRaw = process.env.DB_URL;
if (!dbUrlRaw) {
    throw new Error("Missing DB_URL environment variable");
}

const refreshTokenSecret = process.env.SESSION_SECRET;
if (!refreshTokenSecret || refreshTokenSecret.length < 16) {
    throw new Error("Missing or weak SESSION_SECRET (min length 16)");
}

const accessTokenSecret = process.env.JWT_ACCESS_SECRET ?? refreshTokenSecret;
if (!accessTokenSecret || accessTokenSecret.length < 16) {
    throw new Error("Missing or weak JWT_ACCESS_SECRET (min length 16)");
}

export const CONFIG: RuntimeConfig = {
    port: 4000,
    dbUrl: new URL(dbUrlRaw),
    appOrigin: process.env.APP_ORIGIN ?? null,
    corsOrigin: process.env.CORS_ORIGIN ?? null,
    refreshTokenSecret,
    accessTokenSecret,
    accessCookieName: "__acc",
    refreshCookieName: "__ref",
    accessTokenMaxAge: 60 * 10, // 10 minutes
    refreshTokenMaxAge: 60 * 60 * 24 * 7, // 7 days
    refreshGraceWindow: 30, // 30 seconds
    refreshBeforeExpiry: 60, // refresh 60 seconds before access expiry
    ip_validation: true,
    agent_validation: true,
};
