---
name: dev-and-verify
description: Runs automated unit tests, API smoke tests, and production Vite builds to verify SkyPilot changes end-to-end. Use whenever modifying backend tools/routes, AI adapters, or frontend components.
---

# SkyPilot Development & Verification Skill

Use this skill to verify any code changes in the SkyPilot monorepo before completing a task or opening a PR.

## 1. Quick Verification Command

From the repository root (`/Users/rdabbir/Pet Projects/Paragliding-agent`), run:

```bash
npm run verify
```

This single command executes:
1. **`npm test`**: Runs the Node.js test suite (`server/test/skypilot.test.js`) covering wind scoring, weather caching, AI model catalog resolution, 3-tier site discovery (`ParaglidingEarth` -> `Overpass OSM` -> `fallbackSites.json`), and Express route validation.
2. **`npm run build`**: Builds the production React + Vite + PWA bundle in `client/dist/` (verifying all imports, WebWorkers, and Workbox service worker precache limits).

## 2. Live API Smoke Verification

When modifying backend routes (`server/routes/`) or weather/site tools (`server/tools/`), verify the HTTP endpoints:

```bash
# Start backend on an ephemeral port and run smoke checks
PORT=3099 node server/index.js &
SERVER_PID=$!
sleep 2

# 1. Health check
curl -s http://localhost:3099/api/health

# 2. 3-tier site discovery (Bay Area)
curl -s "http://localhost:3099/api/sites?lat=37.66&lng=-122.49&distance=50" | head -c 400

# 3. 7-day forecast (Mussel Rock)
curl -s "http://localhost:3099/api/forecast?lat=37.6669&lng=-122.4939&siteName=Mussel%20Rock" | head -c 400

# 4. Regional Morning Brief (rule-based / WebAI summary mode)
curl -s "http://localhost:3099/api/brief?lat=37.66&lng=-122.49" | head -c 400

kill $SERVER_PID
```

## 3. Common Pitfalls to Avoid
- **Never use `axios` in `client/src/`**: The frontend uses native browser `fetch()`. `axios` is only installed in `server/`.
- **Keep Workbox limits in mind**: `@mlc-ai/web-llm` compiles into an async worker chunk (~6.1 MB). Ensure `workbox.maximumFileSizeToCacheInBytes` in `client/vite.config.js` remains `>= 10 * 1024 * 1024`.
