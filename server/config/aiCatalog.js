/**
 * Central Declarative AI Provider & Model Registry (Server & Shared Reference)
 *
 * Adding a new model or provider in the future requires ONLY adding an entry
 * here (and in client/src/config/aiCatalog.js). All fallback chains, default
 * models, and validation checks read directly from this registry.
 */

export const AI_MODELS = {
    // ── Google Gemini (Cloud BYOK) ───────────────────────────────────────────
    'gemini-3.5-flash-lite': {
        id: 'gemini-3.5-flash-lite',
        providerId: 'gemini',
        executionTarget: 'server-cloud',
        name: 'Gemini 3.5 Flash-Lite',
        shortLabel: '3.5 Flash-Lite',
        creator: 'Google',
        badge: '★ Default · Ultra-Fast & High Quota',
        recommended: true,
        description: 'Lightweight, lowest-latency Gemini model with the most generous free-tier rate limits.',
        specs: { speedRating: 5, reasoningRating: 4, costTier: 'Free Tier' },
    },
    'gemini-3.7-flash': {
        id: 'gemini-3.7-flash',
        providerId: 'gemini',
        executionTarget: 'server-cloud',
        name: 'Gemini 3.7 Flash',
        shortLabel: '3.7 Flash',
        creator: 'Google',
        badge: '🧠 Deep Reasoning',
        recommended: false,
        description: 'Latest frontier Flash model with superior meteorological reasoning and multi-tool agent accuracy.',
        specs: { speedRating: 5, reasoningRating: 5, costTier: 'Free Tier / Low Cost' },
    },
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash',
        providerId: 'gemini',
        executionTarget: 'server-cloud',
        name: 'Gemini 2.5 Flash',
        shortLabel: '2.5 Flash',
        creator: 'Google',
        badge: 'Legacy Fallback',
        recommended: false,
        hiddenInPicker: true,
        description: 'Stable fallback model used automatically if newer tiers hit quota.',
        specs: { speedRating: 4, reasoningRating: 4, costTier: 'Free Tier' },
    },

    // ── Client-Side WebAI (Free / On-Device) ─────────────────────────────────
    'chrome-built-in': {
        id: 'chrome-built-in',
        providerId: 'webai',
        executionTarget: 'client-builtin',
        name: 'Chrome Built-in AI (Gemini Nano)',
        shortLabel: 'Gemini Nano (Built-in)',
        creator: 'Google Chrome',
        badge: '⚡ Instant · 0 MB Download',
        recommended: false,
        description: 'Uses Chrome’s native on-device LanguageModel API. Zero weight download required when enabled in Chrome.',
        specs: { downloadSizeMB: 0, vramRequiredMB: 0, speedRating: 5, reasoningRating: 4, costTier: '100% Free (On-Device)' },
    },
    'Qwen2.5-3B-Instruct-q4f16_1-MLC': {
        id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
        providerId: 'webai',
        executionTarget: 'client-webgpu',
        name: 'Qwen 2.5 3B Instruct',
        shortLabel: 'Qwen 2.5 3B',
        creator: 'Alibaba Cloud',
        badge: '🏆 Recommended Open-Source',
        recommended: true,
        description: 'Best overall open-source model under 2 GB. Exceptional structured JSON adherence and numerical wind math.',
        specs: { downloadSizeMB: 1800, vramRequiredMB: 2505, speedRating: 4, reasoningRating: 5, costTier: '100% Free (WebGPU)' },
    },
    'Hermes-3-Llama-3.2-3B-q4f16_1-MLC': {
        id: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
        providerId: 'webai',
        executionTarget: 'client-webgpu',
        name: 'Hermes 3 (Llama 3.2 3B)',
        shortLabel: 'Hermes 3 3B',
        creator: 'Nous Research / Meta',
        badge: '🛠️ Best for Agent Chat',
        recommended: false,
        description: 'Fine-tuned on Llama 3.2 3B specifically for system prompt obedience, tool use, and structured reasoning.',
        specs: { downloadSizeMB: 1700, vramRequiredMB: 2260, speedRating: 4, reasoningRating: 5, costTier: '100% Free (WebGPU)' },
    },
    'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': {
        id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        providerId: 'webai',
        executionTarget: 'client-webgpu',
        name: 'Qwen 2.5 1.5B Instruct',
        shortLabel: 'Qwen 2.5 1.5B (Lite)',
        creator: 'Alibaba Cloud',
        badge: '🪶 Ultra-Lite (<1 GB)',
        recommended: false,
        description: 'Compact sub-1 GB download ideal for integrated GPUs, lower-memory laptops, and fast initial setup.',
        specs: { downloadSizeMB: 950, vramRequiredMB: 1630, speedRating: 5, reasoningRating: 4, costTier: '100% Free (WebGPU)' },
    },
    'Phi-3.5-mini-instruct-q4f16_1-MLC': {
        id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
        providerId: 'webai',
        executionTarget: 'client-webgpu',
        name: 'Phi 3.5 Mini Instruct (3.8B)',
        shortLabel: 'Phi 3.5 Mini',
        creator: 'Microsoft',
        badge: '🧠 Max Reasoning (Pro GPU)',
        recommended: false,
        description: 'Dense 3.8B textbook-trained model that rivals 7B models on analytical synthesis for Apple Silicon & discrete GPUs.',
        specs: { downloadSizeMB: 2150, vramRequiredMB: 3672, speedRating: 3, reasoningRating: 5, costTier: '100% Free (WebGPU)' },
    },

    // ── Anthropic Claude (Cloud BYOK) ────────────────────────────────────────
    'claude-haiku-4-5-20251001': {
        id: 'claude-haiku-4-5-20251001',
        providerId: 'anthropic',
        executionTarget: 'server-cloud',
        name: 'Claude Haiku 4.5',
        shortLabel: 'Haiku 4.5',
        creator: 'Anthropic',
        badge: '★ Recommended',
        recommended: true,
        description: 'Fast, cost-effective Claude 4.5 model with sharp safety reasoning and tool calling.',
        specs: { speedRating: 5, reasoningRating: 4, costTier: 'Paid (Low Cost)' },
    },
    'claude-sonnet-4-5-20250929': {
        id: 'claude-sonnet-4-5-20250929',
        providerId: 'anthropic',
        executionTarget: 'server-cloud',
        name: 'Claude Sonnet 4.5',
        shortLabel: 'Sonnet 4.5',
        creator: 'Anthropic',
        badge: '🧠 Deep Analysis',
        recommended: false,
        description: 'Anthropic’s flagship reasoning model for nuanced micro-meteorology and XC route assessment.',
        specs: { speedRating: 4, reasoningRating: 5, costTier: 'Paid' },
    },

    // ── OpenAI GPT (Cloud BYOK) ──────────────────────────────────────────────
    'gpt-4.1-mini': {
        id: 'gpt-4.1-mini',
        providerId: 'openai',
        executionTarget: 'server-cloud',
        name: 'GPT-4.1 Mini',
        shortLabel: 'GPT-4.1 Mini',
        creator: 'OpenAI',
        badge: '★ Recommended',
        recommended: true,
        description: 'Fast, low-latency OpenAI model with rock-solid JSON formatting and function calling.',
        specs: { speedRating: 5, reasoningRating: 4, costTier: 'Paid (Low Cost)' },
    },
    'gpt-4.1': {
        id: 'gpt-4.1',
        providerId: 'openai',
        executionTarget: 'server-cloud',
        name: 'GPT-4.1',
        shortLabel: 'GPT-4.1',
        creator: 'OpenAI',
        badge: '🧠 Flagship',
        recommended: false,
        description: 'Full-scale GPT-4.1 model for deep multi-site synthesis.',
        specs: { speedRating: 4, reasoningRating: 5, costTier: 'Paid' },
    },

    // ── xAI Grok (Cloud BYOK) ────────────────────────────────────────────────
    'grok-3-mini': {
        id: 'grok-3-mini',
        providerId: 'grok',
        executionTarget: 'server-cloud',
        name: 'Grok 3 Mini',
        shortLabel: 'Grok 3 Mini',
        creator: 'xAI',
        badge: '★ Recommended',
        recommended: true,
        description: 'Ultra-fast reasoning model from xAI with full tool-calling support.',
        specs: { speedRating: 5, reasoningRating: 4, costTier: 'Paid (Low Cost)' },
    },
    'grok-3': {
        id: 'grok-3',
        providerId: 'grok',
        executionTarget: 'server-cloud',
        name: 'Grok 3',
        shortLabel: 'Grok 3',
        creator: 'xAI',
        badge: '🧠 Flagship',
        recommended: false,
        description: 'xAI’s flagship large model for comprehensive atmospheric analysis.',
        specs: { speedRating: 4, reasoningRating: 5, costTier: 'Paid' },
    },
};

export const AI_PROVIDERS = {
    webai: {
        id: 'webai',
        name: 'WebAI',
        company: 'On-Device (Free)',
        track: 'local',
        requiresApiKey: false,
        defaultModel: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
        fallbackChain: [
            'Qwen2.5-3B-Instruct-q4f16_1-MLC',
            'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
        ],
    },
    gemini: {
        id: 'gemini',
        name: 'Gemini',
        company: 'Google',
        track: 'cloud',
        requiresApiKey: true,
        defaultModel: 'gemini-3.5-flash-lite',
        fallbackChain: [
            'gemini-3.5-flash-lite',
            'gemini-3.7-flash',
            'gemini-2.5-flash',
        ],
    },
    anthropic: {
        id: 'anthropic',
        name: 'Claude',
        company: 'Anthropic',
        track: 'cloud',
        requiresApiKey: true,
        defaultModel: 'claude-haiku-4-5-20251001',
        fallbackChain: [
            'claude-haiku-4-5-20251001',
        ],
    },
    openai: {
        id: 'openai',
        name: 'GPT',
        company: 'OpenAI',
        track: 'cloud',
        requiresApiKey: true,
        defaultModel: 'gpt-4.1-mini',
        fallbackChain: [
            'gpt-4.1-mini',
        ],
    },
    grok: {
        id: 'grok',
        name: 'Grok',
        company: 'xAI',
        track: 'cloud',
        requiresApiKey: true,
        defaultModel: 'grok-3-mini',
        fallbackChain: [
            'grok-3-mini',
        ],
    },
};

/**
 * Get the ordered fallback model list for a provider, prioritizing `preferredModel`
 * if valid for that provider.
 */
export function getProviderFallbackChain(providerId = 'gemini', preferredModel = null) {
    const provider = AI_PROVIDERS[providerId] || AI_PROVIDERS.gemini;
    const baseChain = [...(provider.fallbackChain || [provider.defaultModel])];

    if (preferredModel && AI_MODELS[preferredModel]?.providerId === provider.id) {
        return [preferredModel, ...baseChain.filter(m => m !== preferredModel)];
    }
    return baseChain;
}

/**
 * Resolve the primary model for a provider given an optional override.
 */
export function resolveProviderModel(providerId = 'gemini', preferredModel = null) {
    const chain = getProviderFallbackChain(providerId, preferredModel);
    return chain[0];
}

/**
 * Check if an error is a quota/rate-limit/availability error that should trigger model fallback.
 */
export function isFallbackEligibleError(err) {
    const msg = (err?.message || '').toLowerCase();
    const status = err?.status || err?.statusCode;
    return (
        status === 429 ||
        status === 503 ||
        status === 404 ||
        msg.includes('429') ||
        msg.includes('quota') ||
        msg.includes('too many requests') ||
        msg.includes('rate limit') ||
        msg.includes('503') ||
        msg.includes('high demand') ||
        msg.includes('overloaded') ||
        msg.includes('404') ||
        msg.includes('not found')
    );
}
