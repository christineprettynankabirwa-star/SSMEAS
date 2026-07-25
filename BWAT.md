# BWAT.md

This file provides guidance to Bwat when working with code in this repository.

## Tech Stack

- **Dashboard**: Next.js 16 (App Router), React 19, TypeScript 5, Tailwind CSS 4
- **Backend**: Express 5 (TypeScript 6), PostgreSQL 16 via `pg` (no ORM), JWT auth (bcrypt + jsonwebtoken)
- **Firmware**: Arduino C++ for ESP32 — core libraries only (WiFi, HTTPClient)
- **Prediction engine**: Placeholder directory (empty, not yet implemented)
- **Key deps**: leaflet + react-leaflet (GIS map), recharts (charts), axios (HTTP), Thingspeak (IoT telemetry bridge)

## Brand Identity

**Colors** (from `globals.css` custom properties; use existing tokens, never invent new values):
- Background: `#eef5f8` (`--background`)
- Foreground / text: `#102338` (`--foreground`, `--ss-text`)
- Secondary text: `#40566d` (`--ss-text-secondary`)
- Muted text: `#708399` (`--ss-text-muted`)
- Brand accent (cyan): `#22d3ee` (`--ss-cyan`) — used for primary CTAs, focus rings, decorative highlights
- Accent dark: `#0e7490` — used for secondary accent text, hover effects, cyan-700
- Surface (frosted): `rgb(255 255 255 / .88)` (`--ss-surface`) with `backdrop-filter: blur(16px)`
- Surface strong: `#ffffff` (`--ss-surface-strong`)
- Surface hover: `#f1f8fa` (`--ss-surface-hover`)
- Border: `rgb(15 68 89 / .12)` (`--ss-border`)
- Status safe: `#34d399` (green)
- Status warning: `#fbbf24` (amber)
- Status danger: `#fb7185` (red)
- Cyan accent border: `rgb(8 145 178 / .25)` (`--ss-border-cyan`)

**Typography**:
- Body / UI: `Arial, Helvetica, sans-serif` (set via `--font-sans`)
- Monospace: `"Courier New", Courier, monospace` (set via `--font-mono`)
- No custom/imported fonts — uses system sans-serif stack

**Geometry**:
- Card radius: `1rem` (`--ss-radius-card`)
- Panel radius: `0.75rem` (utility `.panel` class)
- Small radius (metric icons, buttons): `0.75rem` / `0.5rem`
- Card shadow: `0 14px 38px rgb(35 76 96 / .10)` (`--ss-shadow-card`)
- Spacing scale: Tailwind default (`gap-3`, `p-4`, `p-5`, etc.)

**Visual language**: "Control room" aesthetic — frosted-glass surfaces with backdrop-blur, cyan accent on cool blue-gray base, generous rounding (1rem cards), subtle shadows, gentle micro-interactions (180ms transitions, 1px lift on hover, `.97` scale on press), and a dark-on-light palette with status-colored indicators.

## Coding Conventions

- **TypeScript**: Use `strict` mode. Backend also requires `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. No `any` — prefer `unknown` and narrow it.
- **Backend modules**: CommonJS (`type: "commonjs"` in package.json). ES2022 target.
- **Raw SQL, no ORM**: All database queries use `pg.Pool` with parameterized queries (`$1`, `$2`). Joins and aggregations are handwritten. Migrations are executable `.sql` files run via `database-task.ts`.
- **UUID primary keys**: All tables use `UUID PRIMARY KEY DEFAULT gen_random_uuid()`. Ensure `CREATE EXTENSION IF NOT EXISTS "pgcrypto"` at the top of every migration.
- **JWT auth**: Bearer token in `Authorization` header. Token stored in `sessionStorage` key `ssmeas_access_token` on the dashboard. The `authenticate` middleware always queries the DB to verify the user still exists — don't skip this.
- **Express 5 route pattern**: Routes are `./routes/*.routes.ts` files each exporting a `Router`, centralized in `routes/index.ts`. Middleware (authenticate, authorize) applied per-route or per-router.
- **Dashboard components**: Interactive pages use `"use client"`. Layout and simple wrappers use Server Components (no `"use client"`). UI primitives live in `components/ui/`, feature components in `components/{feature}/`.
- **No component library**: No shadcn/ui, Material UI, or Chakra. All UI is hand-rolled with Tailwind utility classes and CSS custom properties from `globals.css`.
- **CSS approach**: Tailwind v4 with `@import "tailwindcss"` syntax (no `tailwind.config.*` file). Theme extensions live in `@theme inline` block in `globals.css`. `.control-room` wrapper class applies the frosted-surface remapping system — the dashboard's main content area always lives inside a `.control-room` container.
- **ESP32 firmware**: No third-party Arduino libraries. No secrets stored in firmware — credentials (`WIFI_SSID`, `WIFI_PASSWORD`, `API_URL`, `DEVICE_API_KEY`, `TANK_UUID`) must be edited in `SewerGuard_ESP32.ino` before upload.

## Architecture Notes

**System topology**: ESP32 firmware reads physical sensors (ultrasonic for level, MQ for gas) and publishes to ThingSpeak. The TypeScript backend periodically fetches ThingSpeak feeds via REST, normalizes readings into PostgreSQL, computes alert statuses, and serves a REST API. The Next.js dashboard polls the backend every 3 seconds and renders the "control room" UI with maps, charts, alerts, and maintenance workflows.

**Backend layers**: `app.ts` (Express config + CORS) → `routes/index.ts` (centralized route mounting) → individual `*.routes.ts` files (request parsing + response shaping) → `services/*.service.ts` (business logic + DB queries). Auth middleware (`authenticate` + `authorize`) sits between routes and services.

**Dashboard state**: JWT token in `sessionStorage`, loaded on mount via `setTimeout(0)`. DashboardClient manages all state (summary, tanks, readings, alerts, maintenance, predictions) in a single component with `Promise.allSettled` loading. Background polling every 3 seconds. No state management library — plain `useState` + `useCallback`.

**Database relationships**: `tanks` is the root entity. `sensor_readings` FK to `tanks(id)` with ON DELETE RESTRICT. `alerts` FK to `tanks(id)` with ON DELETE RESTRICT and a partial unique index preventing duplicate active alerts per (tank_id, alert_type). `maintenance` and `notifications` tables follow similar patterns (see `database/*.sql` files for full schemas).

**ESP32 → ThingSpeak → Backend flow**: ESP32 sends telemetry to ThingSpeak channel. Backend's `/api/device` endpoint accepts direct POST (for bypass scenarios), and a scheduled service fetches from ThingSpeak periodically. This dual-path means the reading ingestion service must handle idempotency (enforced by the `sensor_readings_thingspeak_entry_unique` constraint on `thingspeak_channel_id + thingspeak_entry_id`).

## Commands

| Context | Command | What it does |
|---|---|---|
| Backend | `npm run dev` | Start dev server with nodemon + ts-node |
| Backend | `npm run build` | Compile TypeScript to `dist/` |
| Backend | `npm test` | Run tests (`node --test` with custom register) |
| Backend | `npm run migrate` | Run SQL migrations from `database/*.sql` |
| Backend | `npm run seed` | Seed database with test data |
| Backend | `npm run demo` | Seed demo data for acceptance testing |
| Backend | `npm run reset-db` | Drop and recreate all tables |
| Backend | `npm run create-user` | Interactive script to create a dashboard user |
| Dashboard | `npm run dev` | Next.js development server |
| Dashboard | `npm run build` | Production build |
| Dashboard | `npm run lint` | ESLint |

## Gotchas

- **Dashboard polls aggressively**: Every authenticated session polls `/api/readings` (and 5 other endpoints) every **3 seconds** via `setInterval`. This is fine for a prototype but will DDoS the backend with many concurrent users. Do not increase polling frequency or add more endpoints to the batch without caching.
- **No ORM isolation**: Backend uses raw SQL with `pg.Pool`. There is no migration runner framework — the `migrate` script reads and executes `.sql` files from `database/` in order. New migrations must be added as new `.sql` files; never reorder or edit existing ones after they've been applied.
- **Auth queries DB every request**: The `authenticate` middleware calls `getProfile(payload.sub)` on every authenticated request to verify the user still exists. This is a DB hit per request — not cached.
- **Env vars for alert thresholds**: `FILL_WARNING_THRESHOLD` (default 80), `FILL_CRITICAL_THRESHOLD` (default 95), and `GAS_LEVEL_THRESHOLD` (default 300) control alert classification. Changes require a backend restart.
- **ThingSpeak dependency**: The primary telemetry ingestion path depends on an external service (ThingSpeak). If ThingSpeak is unreachable, the dashboard shows stale data. The `CRITICAL_MAINTENANCE_DELAY_MINUTES` env var (default 30) controls how long after a critical reading before an automatic maintenance task is created.
- **Prediction engine is empty**: The `prediction-engine/` directory is a placeholder. Any prediction/ML work starts from scratch.
- **ESP32 firmware credentials**: WiFi credentials and device API key must be hardcoded in `SewerGuard_ESP32.ino` before upload. The `DEVICE_API_KEY` must match `DEVICE_API_KEY` in the backend `.env`.
- **No Tailwind config file**: Tailwind v4 uses `@import "tailwindcss"` syntax with `@theme inline` overrides in `globals.css`. There is no `tailwind.config.*`. The theme only overrides `--color-background`, `--color-foreground`, `--font-sans`, and `--font-mono` — all other tokens are used via inline CSS custom properties or utility classes.
- **`control-room` class**: The dashboard's `AppShell` wraps all content in a `.control-room` div. This class remaps standard Tailwind utilities (`.bg-white`, `.text-slate-*`, `.border-slate-*`, `.shadow-*`) to the frosted-surface design system. Any new page or component rendered inside the shell will inherit this remapping automatically, but new standalone pages outside the shell will NOT get these overrides.
- **Session storage vs cookies**: The dashboard stores the JWT access token in `sessionStorage` (key `ssmeas_access_token`), not in cookies. This means the token is lost on tab close and there is no HTTP-only cookie protection. The login form calls `sessionStorage.setItem("ssmeas_access_token", token)` and `setAccessToken(token)` from the API service.
