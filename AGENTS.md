# AGENTS.md — SkyPilot Agentic Engineering Guide

This repository is structured for autonomous AI coding agents (Google Antigravity, Claude Code, Cursor, etc.). Read this file first before making changes.

## 1. Quick Commands

```bash
# Run both frontend (:5173) and backend (:3001) in watch mode
npm run dev

# Run backend unit & integration test suite (Node built-in test runner)
npm test

# Full verification (runs tests + builds production Vite/PWA bundle)
npm run verify
```

## 2. Project Architecture Map

SkyPilot is a full-stack paragliding flyability & weather advisor monorepo:

- **`server/` (Express Backend, port `3001`)**
  - `config/aiCatalog.js`: Central declarative registry of all AI providers (`webai`, `gemini`, `anthropic`, `openai`, `grok`), models (`gemini-3.7-flash`, `gemini-3.5-flash-lite`, `Qwen2.5-3B-Instruct-q4f16_1-MLC`, `chrome-built-in`, etc.), and fallback chains.
  - `tools/getSites.js` & `data/fallbackSites.json`: **3-Tier Resilient Site Discovery**:
    - Tier 1: ParaglidingEarth GeoJSON API (with browser User-Agent & 3.5s timeout).
    - Tier 2: OpenStreetMap Overpass API (`sport=free_flying`) merged with curated sites.
    - Tier 3: Haversine-filtered curated site catalog (`fallbackSites.json`).
  - `tools/getWeather.js`: Fetches multi-altitude (`10m`, `80m`, `120m`, `180m`) hourly weather from Open-Meteo (`mph` units).
  - `utils/windUtils.js`: Deterministic rule-based flyability engine (`GO`, `MARGINAL`, `NO_GO`).
  - `services/aiVerdict.js`: Generates 7-day structured JSON verdicts and regional morning briefs (with `buildRuleBasedRegionalBrief` baseline when no cloud key is present).
  - `services/gemini.js` & `utils/aiClient.js`: Cloud BYOK tool-calling loops supporting `x-ai-provider`, `x-ai-model`, and `x-ai-api-key`.
  - `test/skypilot.test.js`: Automated test suite (`node --test`).

- **`client/` (React + Vite + PWA Frontend, port `5173`)**
  - `src/utils/aiHeaders.jsx`: Client-side model & provider catalog, `localStorage` state helpers, and `'ai-config-changed'` event dispatcher.
  - `src/workers/webLlmWorker.js`: WebWorker hosting `WebWorkerMLCEngineHandler` (`@mlc-ai/web-llm`) for off-main-thread WebGPU inference.
  - `src/services/webAiCapabilities.js`: Detects WebGPU adapter/VRAM limits, Chrome Built-in AI (`self.LanguageModel`), storage quota, cached models, and computes hardware-aware model recommendations.
  - `src/services/webAiEngine.js`: Unified client-side engine supporting both WebLLM (`CreateWebWorkerMLCEngine`) and Chrome Built-in Gemini Nano (`self.LanguageModel`).
  - `src/services/aiOrchestrator.js`: Client-side orchestrator for local 7-day verdicts (`generateLocalWeeklyVerdicts`), regional briefs (`generateLocalRegionalBrief`), and streaming chat (`runLocalChatAgent`).
  - `src/components/SettingsModal.jsx` & `OnboardingStepper.jsx`: Flagship AI Model Studio UI (segmented switcher between Free On-Device WebAI and Cloud API Keys, sub-model selector cards, live download progress bar, and cache management).

## 3. Installed Agent Skills (`.agents/skills/`)

Check `.agents/skills/` for task-specific workflows:
- `dev-and-verify`: End-to-end test, build, and live endpoint verification workflow.
- `ai-provider-integration`: How to add new Cloud or WebAI models in 2 declarative steps.
- `paragliding-domain-rules`: Reference for wind thresholds, site direction scoring, and cache keys.
- `pr-documentation`: Checklist for keeping `README.md`, `AGENTS.md`, `CLAUDE.md`, and package versions in sync.
