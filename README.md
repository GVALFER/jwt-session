# JWT Session Demo

Minimal full-stack auth demo with:
- API: Hono + Prisma + MySQL
- Dashboard: Next.js + ky
- Session model: JWT access cookie + rotating refresh cookie

## Quick start
1. Copy env files:
   ```bash
   cp api/.env.example api/.env
   cp dash/.env.local.example dash/.env.local
   ```
2. Install dependencies:
   ```bash
   cd api && npm install
   cd ../dash && npm install
   ```
3. Run migrations:
   ```bash
   cd api
   npm run migrate
   ```
4. Start apps in separate terminals:
   ```bash
   # Terminal 1
   cd api
   npm run dev

   # Terminal 2
   cd dash
   npm run dev
   ```

## Configuration

### API environment variables

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `NODE_ENV` | No | `development` | Enables production cookie security when set to `production` |
| `DB_URL` | Yes | `mysql://user:password@127.0.0.1:3306/auth` | MySQL connection string |
| `SESSION_SECRET` | Yes | `replace-with-a-long-random-secret` | Secret for refresh token hashing (min 16 chars) |
| `JWT_ACCESS_SECRET` | Yes | `replace-with-a-different-long-random-secret` | Secret for access JWT signing (min 16 chars) |
| `APP_ORIGIN` | Recommended | `http://localhost:3000` | Used by CSRF origin checks |
| `CORS_ORIGIN` | Recommended | `http://localhost:3000` | Allowed origin for auth routes |

### Dashboard environment variables

| Variable | Required | Example | Notes |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_API_BASE` | Yes | `/api` | Browser base path used by ky |
| `API_INTERNAL_URL` | Yes | `http://127.0.0.1:4000` | Server-side URL used by Next.js and proxy refresh |

### API runtime auth config (`api/src/config/index.ts`)

| Key | Current value | Purpose |
| --- | --- | --- |
| `accessCookieName` | `__acc` | Access token cookie base name |
| `refreshCookieName` | `__ref` | Refresh token cookie base name |
| `accessTokenMaxAge` | `60 * 10` | Access token lifetime (seconds) |
| `refreshTokenMaxAge` | `60 * 60 * 24 * 7` | Refresh token lifetime (seconds) |
| `refreshGraceWindow` | `30` | Grace window during refresh rotation (seconds) |
| `refreshBeforeExpiry` | `60` | Refresh lead time before access expiry (seconds) |

## Scripts

### API (`api/package.json`)
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run migrate`
- `npm run deploy`

### Dashboard (`dash/package.json`)
- `npm run dev`
- `npm run build`
- `npm run start`
- `npm run typecheck`

## Dashboard routing source of truth

Routes and status helpers are centralized in `dash/src/lib/authRouting.ts`:
- Public pages: `/login`, `/register`, `/maintenance`
- Private pages: `/dashboard`
- Auth API paths: `auth/login`, `auth/register`, `auth/refresh`
- Status mapping: `429` and `>=500` are maintenance statuses

## Dashboard API client examples (`dash/src/lib/api.ts`)

Examples below are generic request patterns (not tied to auth flow):

```ts
import { api } from "@/src/lib/api";

// GET
const profile = await api
  .get("users/me")
  .json<{ id: string; email: string; name: string }>();

// POST
await api.post("tickets", {
  json: { subject: "Need help", message: "My service is down" },
});

// PUT
await api.put("users/me", {
  json: { name: "Updated Name" },
});

// DELETE
await api.delete("tickets/123");
```

## Auth behavior (current)
- Protected route checks are handled in `dash/proxy.ts`.
- Proxy decodes access token `exp`; if expired and refresh exists, it calls `POST /auth/refresh`, forwards cookies/headers, and applies returned `set-cookie` headers.
- On refresh failure, redirects are status-based:
  - `429` or `>=500` -> `/maintenance?status=<status>`
  - other auth failures (`401`/`403`) -> `/login`
- Client-side ky `afterResponse` mirrors the same redirect policy and does a single reload retry on `403` (to let proxy refresh first).
- SessionProvider no longer runs a client refresh timer; refresh ownership is proxy-first.
- API protected routes use JWT-only validation in `authGuard` (no DB read per protected request).
- Refresh session state is stored in `user_sessions` and rotated on `/auth/refresh`.
- If a refresh session is revoked, current access JWT remains valid until it expires.
