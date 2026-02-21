import { serve } from "@hono/node-server";
import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { csrf } from "hono/csrf";
import { requestId } from "hono/request-id";
import { secureHeaders } from "hono/secure-headers";
import { CONFIG, errorHandler } from "./lib/index.js";
import routes from "./routes/index.js";
import { logger } from "hono/logger";

const app = new Hono();

app.use("*", logger());
app.use("*", requestId());
app.use("*", secureHeaders());

const csrfOrigins = [CONFIG.appOrigin, CONFIG.corsOrigin].filter(
    (origin): origin is string => {
        return !!origin;
    },
);

app.use(
    "/auth/*",
    cors({
        origin: CONFIG?.corsOrigin || "*",
        allowMethods: ["GET", "POST", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
        credentials: true,
        maxAge: 600,
    }),
);

app.use("/auth/*", csrf({ origin: csrfOrigins }));

app.onError((err, c) => {
    const { status, body } = errorHandler(err);
    return c.json(body, status);
});

// 404 Not Found Middleware
app.notFound((c) =>
    c.json({ code: "NOT_FOUND", error: "Route not found" }, 404),
);

// Register routes
app.route("/", routes);

// Start the server
serve({ fetch: app.fetch, port: CONFIG.port, hostname: "0.0.0.0" }, (info) => {
    console.log(`✅ API running at: http://${info.address}:${info.port}`);
});
