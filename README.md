# @nurulizyansyaza/courier-service-frontend

Multi-framework frontend dashboard for the **Courier Service** App Calculator. Supports React, Vue, and Svelte with hot-swappable framework switching.

## Setup

```bash
npm install
npm run dev     # starts Vite dev server on http://localhost:5173
```

## Architecture

The frontend provides a terminal-style UI where users input package data and receive cost/delivery time calculations. It supports three frameworks sharing a common core:

```
src/
  core/               # Shared logic (framework-agnostic)
    calculations.ts   # Core library wrappers
    calculationRunner.ts  # API-first runner with local fallback
    tabStateManager.ts    # Tab state management
    sessionPersistence.ts # localStorage save/load
    frameworkSwitcher.ts  # Framework switching (dev + production)
    types.ts              # Shared TypeScript types
  react/              # React implementation
  vue/                # Vue implementation
  svelte/             # Svelte implementation
```

### Framework Switching

**Dev mode** — switch frameworks at runtime via the terminal UI (`use vue`) or API:

```bash
# Via Vite dev server API
curl -X POST http://localhost:5173/__api/switch-framework \
  -H 'Content-Type: application/json' \
  -d '{"framework": "vue"}'

# Or via npm scripts
npm run use:react
npm run use:vue
npm run use:svelte
```

Or edit `framework.config.json`:
```json
{ "framework": "react" }
```

**Production mode** — all three frameworks are deployed simultaneously to S3 at `/react/`, `/vue/`, `/svelte/`. The `use <framework>` command navigates the user's browser to the corresponding URL. Framework switching is **per-user** — each user independently chooses their framework without affecting others.

### Session Persistence

Session state (tabs, input data, command history) is saved to `localStorage` and restored on page reload. This prevents data loss when refreshing the browser or reopening the terminal.

- State is saved on every tab change and before the page unloads
- Command history is capped at 200 entries per tab
- Closed tab UI states are pruned to prevent unbounded storage growth

## API Integration

The frontend uses a dual-mode calculation strategy:

1. **API mode** (primary) — Sends requests to `/api/cost` and `/api/delivery/transit` endpoints, benefiting from server-side rate limiting and validation
2. **Local mode** (fallback) — If the API is unreachable, calculations run client-side using the core library directly

### Vite Proxy

In development, `/api/*` requests are proxied to the API server:

```
Frontend (localhost:5173) → Proxy → API (localhost:3000)
```

To use API mode, start both servers:

```bash
# Terminal 1: API server
cd ../courier-service-api && npm run dev

# Terminal 2: Frontend
npm run dev
```

The app works without the API running — calculations fall back to local mode automatically.

## Testing

```bash
npm test        # runs vitest
```

Tests mock `fetch` to simulate API unavailability, verifying local fallback behavior.

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`:

1. **Test** — checks out `courier-service-core`, builds it, then runs type-check, tests, and production build
2. **Trigger Staging Deploy** — on push to `main`, dispatches a `repository_dispatch` event to [`courier-service`](https://github.com/nurulizyansyaza/courier-service), which triggers the staging deployment pipeline

Requires a `DEPLOY_TRIGGER_TOKEN` secret (fine-grained PAT with Actions + Contents write access on the `courier-service` repo).

## Build

```bash
npm run build   # produces dist/ for production deployment
```
