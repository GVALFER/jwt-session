import type { Context } from 'hono';

export type ClientInfo = {
    ip: string | null;
    userAgent: string | null;
};

export const getClientInfo = (c: Context): ClientInfo => {
    const headers = c.req.raw.headers;

    // Get the client's IP address
    const forwardedFor = headers.get('x-forwarded-for');
    const cfConnectingIp = headers.get('cf-connecting-ip');
    const realIp = headers.get('x-real-ip');
    const ip = cfConnectingIp ?? forwardedFor?.split(',')[0]?.trim() ?? realIp ?? null;

    // Get the client's user agent
    const userAgentHeader = headers.get('user-agent');
    const trimUserAgent = userAgentHeader?.trim();
    const userAgent = trimUserAgent && trimUserAgent.length > 0 ? trimUserAgent : null;

    return {
        ip,
        userAgent,
    };
};
