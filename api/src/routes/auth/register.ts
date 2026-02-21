import { Hono } from "hono";
import * as v from "valibot";
import {
    Err,
    hashPassword,
    prisma,
    registerRateLimit,
    validator,
} from "../../lib/index.js";

const app = new Hono();

const schema = validator(
    "json",
    v.strictObject({
        email: v.pipe(v.string(), v.email()),
        password: v.pipe(v.string(), v.minLength(5), v.maxLength(512)),
    }),
);

app.post("/", registerRateLimit, schema, async (c) => {
    const payload = c.req.valid("json");
    const email = payload.email.trim().toLowerCase();

    // check if email already exists
    const existingUser = await prisma.users.findUnique({
        where: { email },
        select: { id: true },
    });

    if (existingUser) {
        throw Err("Email already in use", 400);
    }

    const passwordHash = await hashPassword(payload.password);

    await prisma.users.create({
        data: {
            email,
            password_hash: passwordHash,
        },
    });

    return c.json({ message: "User registered successfully" }, 201);
});

export default app;
