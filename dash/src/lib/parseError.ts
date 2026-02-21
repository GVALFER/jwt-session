type ParsedError = {
    status: number;
    message: string;
    code?: string;
};

type ErrorWithStatus = {
    status?: number;
    response?: { status?: number };
    code?: string;
    message?: string;
};

export const parseError = (error: unknown): ParsedError => {
    if (error && typeof error === "object") {
        const err = error as ErrorWithStatus;

        return {
            status: err.status ?? err.response?.status ?? 503,
            message: err.message || "An unexpected error occurred.",
            code: err.code,
        };
    }

    return {
        status: 503,
        message: "An unexpected error occurred.",
    };
};
