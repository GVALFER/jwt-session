import { HTTPException } from "hono/http-exception";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { Prisma } from "./db.js";

export type ErrorPayload = {
    code: string;
    error: string | string[];
};

export const errorHandler = (
    err: unknown,
): { status: ContentfulStatusCode; body: ErrorPayload; stack?: string } => {
    const http = err instanceof HTTPException ? err : undefined;
    const baseStatus = http?.status ?? 500;
    const cause = (http?.cause ?? err) as unknown;

    // Invalid JSON
    if (cause instanceof SyntaxError) {
        return {
            status: 400,
            body: { code: "BAD_REQUEST", error: "Invalid JSON body" },
            stack: cause.stack,
        };
    }

    // Prisma: known errors P20xx (without exposing meta/SQL)
    if (cause instanceof Prisma.PrismaClientKnownRequestError) {
        switch (cause.code) {
            case "P2002": // unique
                return {
                    status: 409,
                    body: {
                        code: "UNIQUE_CONSTRAINT",
                        error: "A record with these values already exists.",
                    },
                    stack: cause.stack,
                };
            case "P2025": // record not found
            case "P2001": // where no records
                return {
                    status: 404,
                    body: { code: "NOT_FOUND", error: "Record not found." },
                    stack: cause.stack,
                };
            case "P2003": // FK
            case "P2014": // invalid relation
                return {
                    status: 409,
                    body: {
                        code: "RELATION_VIOLATION",
                        error: "Invalid relation.",
                    },
                    stack: cause.stack,
                };
            case "P2000": // value too long
                return {
                    status: 400,
                    body: { code: "VALUE_TOO_LONG", error: "Value too long." },
                    stack: cause.stack,
                };
            case "P2011": // NOT NULL
            case "P2012": // missing required value
                return {
                    status: 400,
                    body: {
                        code: "REQUIRED_FIELD_MISSING",
                        error: "Required field missing.",
                    },
                    stack: cause.stack,
                };
            case "P2033": // number out of range
                return {
                    status: 400,
                    body: {
                        code: "NUMBER_OUT_OF_RANGE",
                        error: "Number out of allowed range.",
                    },
                    stack: cause.stack,
                };
            default:
                return {
                    status: 400,
                    body: { code: cause.code, error: "Invalid request." },
                    stack: cause.stack,
                };
        }
    }

    // Prisma: client validation
    if (cause instanceof Prisma.PrismaClientValidationError) {
        return {
            status: 400,
            body: { code: "VALIDATION_ERROR", error: "Invalid data." },
            stack: cause.stack,
        };
    }

    // Prisma: init / panic / unknown
    if (cause instanceof Prisma.PrismaClientInitializationError) {
        return {
            status: 503,
            body: {
                code: "INTERNAL_ERROR",
                error: "Service temporarily unavailable.",
            },
            stack: cause.stack,
        };
    }
    if (cause instanceof Prisma.PrismaClientRustPanicError) {
        return {
            status: 500,
            body: { code: "INTERNAL_ERROR", error: "Internal server error." },
            stack: cause.stack,
        };
    }
    if (cause instanceof Prisma.PrismaClientUnknownRequestError) {
        return {
            status: 500,
            body: { code: "INTERNAL_ERROR", error: "Internal server error." },
            stack: cause.stack,
        };
    }

    // Fallback
    const status = (
        baseStatus >= 400 && baseStatus <= 599 ? baseStatus : 500
    ) as ContentfulStatusCode;
    const is500 = status >= 500;
    const msg =
        (err as any)?.message ??
        (is500 ? "Internal Server Error" : "Bad Request");

    return {
        status,
        body: {
            code: is500 ? "INTERNAL_ERROR" : "BAD_REQUEST",
            error: msg,
        },
        stack: (err as any)?.stack || String(err),
    };
};

export const Err = (message: string, status: ContentfulStatusCode = 500) => {
    return new HTTPException(status, { message });
};
