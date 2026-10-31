# CLAUDE.md

This file provides guidance to AI coding agents (Claude Code, Google Antigravity, etc.) when working with code in this repository. Also see [`AGENTS.md`](./AGENTS.md) and `.agents/skills/`.

## Commands

**Development (runs both frontend and backend concurrently):**
```bash
npm run dev
```

**Individual services:**
```bash
npm run dev:server    # Backend on :3001 (node --watch for hot reload)
npm run dev:client    # Frontend on :5173
```

**Testing & Verification:**
```bash
npm test              # Runs backend unit & integration tests (node --test)
npm run verify        # Runs npm test + production Vite/PWA build
```

**Production:**
```bash
npm run build         # Builds client to client/dist/
npm run start         # Starts backend server only
```

**Install dependencies:**
```bash
npm install && cd server && npm install && cd ../client && npm install
```

## Architecture

This is a monorepo with a **React + Vite + PWA frontend** (`/client`, port 5173) and a **Node.js + Express backend** (`/server`, port 3001). In development, Vite proxies `/api/*` requests to the backend.

### Data Flow

1. **Site Discovery (`GET /api/sites`)**: Browser geolocation → 3-tier site discovery (`ParaglidingEarth` → `OpenStreetMap Overpass API` → `server/data/fallbackSites.json`) → rule-based flyability analysis → color-coded map markers (`GO` / `MARGINAL` / `NO_GO`).
2. **Site Forecast (`GET /api/forecast`)**: Open-Meteo 7-day hourly weather → rule-based analysis per hour + either:
   - **Track A (Cloud BYOK)**: Server-side `getAiWeeklyVerdicts` via user's selected provider & model (`x-ai-provider`, `x-ai-model`, `x-ai-api-key`).
   - **Track B (Client-Side WebAI)**: Browser-side `generateLocalWeeklyVerdicts` (`client/src/services/aiOrchestrator.js`) using `@mlc-ai/web-llm` (WebGPU) or Chrome Built-in AI (`self.LanguageModel` — Gemini Nano).
3. **Conversational Flight Advisor**:
   - **Track A (Cloud BYOK)**: `POST /api/chat` → server tool-calling loop (`gemini.js` / `aiClient.js`).
   - **Track B (Client-Side WebAI)**: `runLocalChatAgent` (`client/src/services/aiOrchestrator.js`) fetches live `/api/sites` and `/api/forecast` context and streams tokens directly from the browser GPU/built-in model.

### Declarative AI Model Catalog

All providers and models are centrally registered in:
- `server/config/aiCatalog.js`
- `client/src/utils/aiHeaders.jsx`

Supported providers & models:
- **Free On-Device WebAI (`webai`)**:
  - `Qwen2.5-3B-Instruct-q4f16_1-MLC` (Recommended open-source WebGPU model)
  - `chrome-built-in` (Chrome Built-in Gemini Nano via `self.LanguageModel` — 0 MB download)
  - `Hermes-3-Llama-3.2-3B-q4f16_1-MLC` (Agentic / tool-tuned 3B)
  - `Qwen2.5-1.5B-Instruct-q4f16_1-MLC` (Ultra-lite 1.0 GB)
  - `Phi-3.5-mini-instruct-q4f16_1-MLC` (Deep reasoning 3.8B)
- **Google Gemini (`gemini`)**: `gemini-3.5-flash-lite` (default) → `gemini-3.7-flash` → `gemini-2.5-flash`
- **Anthropic Claude (`anthropic`)**: `claude-haiku-4-5-20251001`, `claude-sonnet-4-5-20250929`
- **OpenAI (`openai`)**: `gpt-4.1-mini`, `gpt-4.1`
- **xAI Grok (`grok`)**: `grok-3-mini`, `grok-3`

### Caching (`server/services/cache.js`)

- Sites (`getSites`): **1 hour**
- Weather (`getWeather`, keyed by `lat,lng,models,forecastDays`): **10 minutes**
- AI weekly verdicts: **6 hours** (server `node-cache` + client `localStorage` for WebAI)
