import type { ValidationTargets } from "hono";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import { sValidator } from "@hono/standard-validator";
import { Err } from "./errorHandler.js";

export const normalizeText = (text: string) => {
    let normalized = text.replace(/_/g, " ");
    normalized = normalized.replace(/[^a-zA-Z\s]/g, "");
    normalized = normalized.replace(/\b\w/g, (char) => char.toUpperCase());
    return normalized;
};

export const validator = <
    T extends StandardSchemaV1,
    Target extends keyof ValidationTargets,
>(
    target: Target,
    schema: T,
) =>
    sValidator(target, schema, (result, c) => {
        if (!result.success) {
            const error = result.error
                .map((e: any) => {
                    const field = e.path?.[0]?.key ?? "Unknown";
                    return `${normalizeText(field)}: ${e.message}`;
                })
                .join("; ");

            throw Err(error, 400);
        }
    });
