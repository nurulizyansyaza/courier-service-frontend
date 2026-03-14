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
    types.ts              # Shared TypeScript types
  react/              # React implementation
  vue/                # Vue implementation
  svelte/             # Svelte implementation
```

### Framework Switching

Switch frameworks at runtime via the UI or API:

```bash
# Via Vite dev server API
curl -X POST http://localhost:5173/__api/switch-framework \
  -H 'Content-Type: application/json' \
  -d '{"framework": "vue"}'
```

Or edit `framework.config.json`:
```json
{ "framework": "react" }
```

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

## Build

```bash
npm run build   # produces dist/ for production deployment
```
