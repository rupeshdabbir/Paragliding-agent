---
name: ai-provider-integration
description: Step-by-step guide for adding or updating Cloud LLM models (Gemini, Claude, OpenAI, Grok) or client-side WebAI models (WebLLM / Chrome Built-in Gemini Nano) in SkyPilot.
---

# AI Provider & Model Integration Skill

SkyPilot uses a **Declarative AI Catalog + Dual-Track Adapter Architecture**:
- **Track A (Cloud BYOK)**: Server-side execution via user-supplied API keys (`x-ai-provider`, `x-ai-model`, `x-ai-api-key`).
- **Track B (Client-Side WebAI)**: 100% in-browser execution via `@mlc-ai/web-llm` (WebGPU WebWorker) or Chrome's Built-in AI (`self.LanguageModel` — Gemini Nano).

## 1. Where Models Are Defined (Single Source of Truth)

To add a new model or update model IDs, update these two mirrored catalogs:
1. **Backend Catalog**: `server/config/aiCatalog.js` (`AI_PROVIDERS`, `getProviderFallbackChain`, `resolveProviderModel`).
2. **Frontend Catalog**: `client/src/utils/aiHeaders.jsx` (`PROVIDER_MODELS`, `PROVIDERS`).

## 2. Adding a New Cloud Model (e.g., Gemini 4.0 Flash)

1. Add the model object to `AI_PROVIDERS.<provider>.models` in `server/config/aiCatalog.js` and update `defaultModel` / `fallbackChain`.
2. Add the matching model entry to `PROVIDER_MODELS.<provider>` in `client/src/utils/aiHeaders.jsx`.
3. No changes are required in `SettingsModal.jsx`, `OnboardingStepper.jsx`, `server/services/gemini.js`, `server/utils/aiClient.js`, or `server/services/aiVerdict.js` — they dynamically read from the catalog and pass `preferredModel` (`x-ai-model`).

## 3. Adding a New Client-Side WebAI Model (WebLLM)

1. Verify the model ID exists in `@mlc-ai/web-llm`'s `prebuiltAppConfig.model_list` (e.g., `Qwen2.5-3B-Instruct-q4f16_1-MLC`).
2. Add the model entry to `PROVIDER_MODELS.webai` in `client/src/utils/aiHeaders.jsx` with:
   - `id`: Exact MLC model ID
   - `name`: Human-readable name
   - `badge`: Speed/quality badge
   - `downloadSize`: Approximate weight size (e.g., `'1.9 GB'`)
   - `vramRequiredMB`: Minimum recommended GPU buffer size
   - `executionMode`: `'client-webgpu'`
3. Add the matching entry in `server/config/aiCatalog.js` under `AI_PROVIDERS.webai.models`.
4. `SettingsModal.jsx`, `webAiCapabilities.js`, and `webAiEngine.js` will automatically render the card, check its IndexedDB cache status, and allow downloading/deleting its weights.
