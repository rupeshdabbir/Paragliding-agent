# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

**Production:**
```bash
npm run build         # Builds client to client/dist/
npm run start         # Starts backend server only
```

**Install dependencies** (must be done separately for each workspace):
```bash
npm install && cd server && npm install && cd ../client && npm install
```

There are no tests or linting configured in this project.

## Architecture

This is a monorepo with a **React + Vite frontend** (`/client`, port 5173) and a **Node.js + Express backend** (`/server`, port 3001). In development, Vite proxies `/api/*` requests to the backend.

### Data Flow

1. User's browser geolocation → `GET /api/sites` → ParaglidingEarth API → rule-based flyability analysis → color-coded map markers (green/orange/red)
2. User clicks a site → `GET /api/forecast` → Open-Meteo 7-day hourly weather → rule-based analysis per hour + AI verdict generation (Gemini) → `SiteForecast` panel
3. User chats → `POST /api/chat` → Gemini agent loop with tool calling → response with optional tool results

### Dual Flyability Rule Engines

The app uses two complementary engines that both produce GO/MARGINAL/NO_GO ratings:

**Rule-Based Engine** (`server/utils/windUtils.js`, `server/tools/analyzeFlyingConditions.js`):
- Wind direction matching against site's accepted directions (ParaglidingEarth 0-2 scale)
- Wind speed thresholds differ by site type: thermaling (0-16 mph) vs ridge soaring (10-25 mph)
- Hard blocks: precipitation > 0.5mm, visibility < 2mi, cloud cover > 85%

**AI-Based Engine** (`server/services/aiVerdict.js`):
- Single Gemini call analyzes all 7 days of hourly data for a site
- Returns per-day: `rating`, `headline`, `reasoning`, `bestWindow`, `safetyNotes[]`
- **AI verdict takes priority** over rule-based verdict in the UI
- Cached 6 hours per site + week-start-date

### Gemini Agent (Chat)

`server/services/gemini.js` runs a tool-calling loop: Gemini generates a response or calls one of three tools (`get_paragliding_sites`, `get_weather_forecast`, `analyze_flying_conditions`), results are fed back, loop repeats until text response. Pre-computed AI verdicts are injected into the system prompt so chat responses are consistent with what the forecast panel shows.

### Caching (`server/services/cache.js`)

- Sites from ParaglidingEarth: **1 hour**
- Weather from Open-Meteo: **10 minutes**
- AI weekly verdicts: **6 hours**

### External APIs

- **Open-Meteo** (free, no key): Hourly wind at 10m/80m/120m/180m altitudes, gusts, precipitation, visibility, cloud cover
- **ParaglidingEarth**: Community site database queried by lat/lng + 50km radius
- **Gemini** (`gemini-3-flash-preview`): Both chat agent and AI verdict generation
- **Nominatim** (OpenStreetMap): Geocoding for site search

### Environment Variables

Required in `server/.env` (or root `.env`):
- `GEMINI_API_KEY` — Google AI Studio key
- `PORT` — Backend port (default 3001)

Optional (Pinecone vector DB, not yet used):
- `PINECONE_API_KEY`, `PINECONE_INDEX`, `PINECONE_ENVIRONMENT`

### Deployment

Configured for Vercel via `vercel.json`: backend routes `/api/*` to `server/index.js` as a serverless function; all other routes serve the static client build from `client/dist/`.
