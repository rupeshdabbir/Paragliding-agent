/**
 * Declarative AI Provider & Model Registry + Header/Storage Utilities (Client)
 *
 * Adding a new cloud or client-side WebAI model in the future requires ONLY
 * adding an entry to PROVIDER_MODELS below. All Settings tabs, Onboarding cards,
 * request headers, and the ClientAIOrchestrator read directly from this registry.
 */

export const PROVIDER_MODELS = {
    webai: [
        {
            id: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
            providerId: 'webai',
            executionTarget: 'client-webgpu',
            name: 'Qwen 2.5 3B Instruct',
            shortLabel: 'Qwen 2.5 3B',
            creator: 'Alibaba Cloud',
            badge: '🏆 Recommended Open-Source',
            badgeColor: '#22c55e',
            recommended: true,
            downloadSizeLabel: '~1.8 GB',
            downloadSizeMB: 1800,
            vramRequiredMB: 2505,
            speedRating: 4,
            reasoningRating: 5,
            description: 'Best balance of download size, strict JSON adherence, and numerical wind-threshold reasoning.',
        },
        {
            id: 'chrome-built-in',
            providerId: 'webai',
            executionTarget: 'client-builtin',
            name: 'Chrome Built-in AI (Gemini Nano)',
            shortLabel: 'Gemini Nano (Built-in)',
            creator: 'Google Chrome',
            badge: '⚡ Instant · 0 MB Download',
            badgeColor: '#00c8ff',
            recommended: false,
            downloadSizeLabel: '0 MB (Built-in)',
            downloadSizeMB: 0,
            vramRequiredMB: 0,
            speedRating: 5,
            reasoningRating: 4,
            description: 'Uses Chrome’s native on-device Prompt API (window.LanguageModel). Zero weight download required when enabled.',
        },
        {
            id: 'Hermes-3-Llama-3.2-3B-q4f16_1-MLC',
            providerId: 'webai',
            executionTarget: 'client-webgpu',
            name: 'Hermes 3 (Llama 3.2 3B)',
            shortLabel: 'Hermes 3 3B',
            creator: 'Nous Research / Meta',
            badge: '🛠️ Best for Agent Chat',
            badgeColor: '#a855f7',
            recommended: false,
            downloadSizeLabel: '~1.7 GB',
            downloadSizeMB: 1700,
            vramRequiredMB: 2260,
            speedRating: 4,
            reasoningRating: 5,
            description: 'Fine-tuned on Llama 3.2 3B specifically for agentic instructions, tool calling, and structured reasoning.',
        },
        {
            id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
            providerId: 'webai',
            executionTarget: 'client-webgpu',
            name: 'Qwen 2.5 1.5B Instruct',
            shortLabel: 'Qwen 2.5 1.5B (Lite)',
            creator: 'Alibaba Cloud',
            badge: '🪶 Ultra-Lite (<1 GB)',
            badgeColor: '#38bdf8',
            recommended: false,
            downloadSizeLabel: '~950 MB',
            downloadSizeMB: 950,
            vramRequiredMB: 1630,
            speedRating: 5,
            reasoningRating: 4,
            description: 'Fast sub-1 GB download ideal for integrated GPUs, lower-memory laptops, and quick setup.',
        },
        {
            id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
            providerId: 'webai',
            executionTarget: 'client-webgpu',
            name: 'Phi 3.5 Mini Instruct (3.8B)',
            shortLabel: 'Phi 3.5 Mini',
            creator: 'Microsoft',
            badge: '🧠 Max Reasoning (Pro GPU)',
            badgeColor: '#f59e0b',
            recommended: false,
            downloadSizeLabel: '~2.1 GB',
            downloadSizeMB: 2150,
            vramRequiredMB: 3672,
            speedRating: 3,
            reasoningRating: 5,
            description: 'Dense 3.8B textbook-trained model that rivals 7B models on analytical synthesis for Apple Silicon & discrete GPUs.',
        },
    ],
    gemini: [
        {
            id: 'gemini-3.7-flash',
            providerId: 'gemini',
            executionTarget: 'server-cloud',
            name: 'Gemini 3.7 Flash',
            shortLabel: 'Gemini 3.7 Flash',
            creator: 'Google',
            badge: '★ Recommended · Deep Reasoning',
            badgeColor: '#22c55e',
            recommended: true,
            speedRating: 5,
            reasoningRating: 5,
            description: 'Latest frontier Flash model for nuanced 7-day meteorological synthesis and multi-tool agent chat.',
        },
        {
            id: 'gemini-3.5-flash-lite',
            providerId: 'gemini',
            executionTarget: 'server-cloud',
            name: 'Gemini 3.5 Flash-Lite',
            shortLabel: 'Gemini 3.5 Flash-Lite',
            creator: 'Google',
            badge: '⚡ Ultra-Fast · Highest Quota',
            badgeColor: '#00c8ff',
            recommended: false,
            speedRating: 5,
            reasoningRating: 4,
            description: 'Lowest-latency Gemini model with the most generous free-tier rate limits for rapid site checks.',
        },
    ],
    anthropic: [
        {
            id: 'claude-haiku-4-5-20251001',
            providerId: 'anthropic',
            executionTarget: 'server-cloud',
            name: 'Claude Haiku 4.5',
            shortLabel: 'Claude Haiku 4.5',
            creator: 'Anthropic',
            badge: '★ Recommended · Fast',
            badgeColor: '#f59e0b',
            recommended: true,
            speedRating: 5,
            reasoningRating: 4,
            description: 'Fast, cost-effective Claude 4.5 model with sharp safety reasoning and tool calling.',
        },
        {
            id: 'claude-sonnet-4-5-20250929',
            providerId: 'anthropic',
            executionTarget: 'server-cloud',
            name: 'Claude Sonnet 4.5',
            shortLabel: 'Claude Sonnet 4.5',
            creator: 'Anthropic',
            badge: '🧠 Deep Analysis',
            badgeColor: '#d97706',
            recommended: false,
            speedRating: 4,
            reasoningRating: 5,
            description: 'Anthropic’s flagship reasoning model for nuanced micro-meteorology and XC route assessment.',
        },
    ],
    openai: [
        {
            id: 'gpt-4.1-mini',
            providerId: 'openai',
            executionTarget: 'server-cloud',
            name: 'GPT-4.1 Mini',
            shortLabel: 'GPT-4.1 Mini',
            creator: 'OpenAI',
            badge: '★ Recommended · Fast',
            badgeColor: '#10b981',
            recommended: true,
            speedRating: 5,
            reasoningRating: 4,
            description: 'Fast, low-latency OpenAI model with rock-solid JSON formatting and function calling.',
        },
        {
            id: 'gpt-4.1',
            providerId: 'openai',
            executionTarget: 'server-cloud',
            name: 'GPT-4.1',
            shortLabel: 'GPT-4.1',
            creator: 'OpenAI',
            badge: '🧠 Flagship',
            badgeColor: '#059669',
            recommended: false,
            speedRating: 4,
            reasoningRating: 5,
            description: 'Full-scale GPT-4.1 model for deep multi-site synthesis.',
        },
    ],
    grok: [
        {
            id: 'grok-3-mini',
            providerId: 'grok',
            executionTarget: 'server-cloud',
            name: 'Grok 3 Mini',
            shortLabel: 'Grok 3 Mini',
            creator: 'xAI',
            badge: '★ Recommended · Fast',
            badgeColor: '#a855f7',
            recommended: true,
            speedRating: 5,
            reasoningRating: 4,
            description: 'Ultra-fast reasoning model from xAI with full tool-calling support.',
        },
        {
            id: 'grok-3',
            providerId: 'grok',
            executionTarget: 'server-cloud',
            name: 'Grok 3',
            shortLabel: 'Grok 3',
            creator: 'xAI',
            badge: '🧠 Flagship',
            badgeColor: '#7c3aed',
            recommended: false,
            speedRating: 4,
            reasoningRating: 5,
            description: 'xAI’s flagship large model for comprehensive atmospheric analysis.',
        },
    ],
};

export const ALL_MODELS_MAP = Object.values(PROVIDER_MODELS)
    .flat()
    .reduce((acc, m) => {
        acc[m.id] = m;
        return acc;
    }, {});

export const PROVIDERS = [
    {
        id: 'webai',
        name: 'WebAI',
        company: 'On-Device',
        track: 'local',
        requiresApiKey: false,
        badge: '100% Free · No Key',
        badgeColor: '#00c8ff',
        accentColor: '#00c8ff',
        gradient: 'linear-gradient(135deg, #00c8ff, #22c55e)',
        placeholder: '',
        storageKey: 'webaiEnabled',
        modelStorageKey: 'webaiModel',
        defaultModel: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
        keyUrl: 'https://webgpu.io/',
        keyLabel: 'WebGPU Browser Info',
        modelHint: 'Qwen2.5-3B / Gemini Nano',
        description: 'Run open-source AI models or Chrome Built-in AI directly in your browser — 100% free, private, no API key required.',
        models: PROVIDER_MODELS.webai,
        icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
                <rect x="4" y="4" width="16" height="16" rx="3" />
                <rect x="9" y="9" width="6" height="6" rx="1" />
                <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
            </svg>
        ),
    },
    {
        id: 'gemini',
        name: 'Gemini',
        company: 'Google',
        track: 'cloud',
        requiresApiKey: true,
        badge: 'Free tier',
        badgeColor: '#22c55e',
        accentColor: '#4285f4',
        gradient: 'linear-gradient(135deg, #4285f4, #34a853)',
        placeholder: 'AIzaSy...',
        storageKey: 'geminiApiKey',
        modelStorageKey: 'geminiModel',
        defaultModel: 'gemini-3.7-flash',
        keyUrl: 'https://aistudio.google.com/app/apikey',
        keyLabel: 'Google AI Studio',
        modelHint: 'gemini-3.7-flash',
        description: 'Recommended Cloud — free tier key, Gemini 3.7 Flash & 3.5 Flash-Lite with automatic fallback.',
        models: PROVIDER_MODELS.gemini,
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M21.5 12a9.5 9.5 0 0 1-9.5 9.5A9.5 9.5 0 0 1 2.5 12 9.5 9.5 0 0 1 12 2.5 9.5 9.5 0 0 1 21.5 12ZM14.5 12.5l2.25 1.25-2.25 1.25L13.25 17.25l-1.25-2.25L9.75 13.75l2.25-1.25L13.25 9.5l1.25 3z" />
            </svg>
        ),
    },
    {
        id: 'anthropic',
        name: 'Claude',
        company: 'Anthropic',
        track: 'cloud',
        requiresApiKey: true,
        badge: 'Paid',
        badgeColor: '#f59e0b',
        accentColor: '#d97706',
        gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
        placeholder: 'sk-ant-...',
        storageKey: 'anthropicApiKey',
        modelStorageKey: 'anthropicModel',
        defaultModel: 'claude-haiku-4-5-20251001',
        keyUrl: 'https://console.anthropic.com/',
        keyLabel: 'Anthropic Console',
        modelHint: 'claude-haiku-4-5-20251001',
        description: 'Exceptional reasoning & safety analysis — supports Claude Haiku 4.5 & Sonnet 4.5.',
        models: PROVIDER_MODELS.anthropic,
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M12 2L2 22h20L12 2zm0 4.5l6.5 13h-13L12 6.5zM12 11l-3 6h6l-3-6z" />
            </svg>
        ),
    },
    {
        id: 'openai',
        name: 'GPT',
        company: 'OpenAI',
        track: 'cloud',
        requiresApiKey: true,
        badge: 'Paid',
        badgeColor: '#10b981',
        accentColor: '#059669',
        gradient: 'linear-gradient(135deg, #059669, #10b981)',
        placeholder: 'sk-...',
        storageKey: 'openaiApiKey',
        modelStorageKey: 'openaiModel',
        defaultModel: 'gpt-4.1-mini',
        keyUrl: 'https://platform.openai.com/api-keys',
        keyLabel: 'OpenAI Platform',
        modelHint: 'gpt-4.1-mini',
        description: 'Industry standard, reliable tool calling — supports GPT-4.1 Mini & GPT-4.1.',
        models: PROVIDER_MODELS.openai,
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M22.28 11.23a8.88 8.88 0 0 0-1.84-6.42A8.85 8.85 0 0 0 13.9 1.5c-4.66 0-8.45 3.79-8.45 8.45 0 .72.1 1.42.27 2.1A8.88 8.88 0 0 0 7.56 18.5a8.85 8.85 0 0 0 6.54 3.32c4.66 0 8.45-3.79 8.45-8.45 0-.72-.1-1.42-.27-2.14zM12 2.58a7.35 7.35 0 0 1 5.37 2.4l-4.22 4.22-3.8-3.8A7.26 7.26 0 0 1 12 2.58zM4.6 10a7.35 7.35 0 0 1 2.4-5.37l3.8 3.8-1.5 1.5H4.81c-.13-.67-.21-1.35-.21-2.03zm7.4 11.42a7.35 7.35 0 0 1-5.37-2.4l4.22-4.22 3.8 3.8a7.26 7.26 0 0 1-2.65 2.82zm7.4-4.04c-.6.6-1.3 1.07-2.07 1.36l-3.8-3.8 1.5-1.5h4.48c.13.67.21 1.35.21 2.03a7.35 7.35 0 0 1-2.4 5.37v-3.46z" />
            </svg>
        ),
    },
    {
        id: 'grok',
        name: 'Grok',
        company: 'xAI',
        track: 'cloud',
        requiresApiKey: true,
        badge: 'Paid',
        badgeColor: '#a855f7',
        accentColor: '#7c3aed',
        gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        placeholder: 'xai-...',
        storageKey: 'grokApiKey',
        modelStorageKey: 'grokModel',
        defaultModel: 'grok-3-mini',
        keyUrl: 'https://console.x.ai/',
        keyLabel: 'xAI Console',
        modelHint: 'grok-3-mini',
        description: 'Ultra-fast responses, full tool calling — supports Grok 3 Mini & Grok 3.',
        models: PROVIDER_MODELS.grok,
        icon: (
            <div style={{ fontSize: '1.4rem', lineHeight: 1, fontFamily: 'serif', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.1em' }}>X</div>
        ),
    },
];

export const CLOUD_PROVIDERS = PROVIDERS.filter(p => p.track === 'cloud');

export function getAIProvider() {
    return (localStorage.getItem('aiProvider') || 'gemini').toLowerCase();
}

export function getProviderConfig(providerId = getAIProvider()) {
    return PROVIDERS.find(p => p.id === providerId) || PROVIDERS[1]; // default gemini
}

export function getAIModel(providerId = getAIProvider()) {
    const provider = getProviderConfig(providerId);
    const saved = localStorage.getItem(provider.modelStorageKey);
    if (saved && provider.models.some(m => m.id === saved)) {
        return saved;
    }
    return provider.defaultModel;
}

export function setAIModel(providerId, modelId) {
    const provider = getProviderConfig(providerId);
    if (provider && modelId) {
        localStorage.setItem(provider.modelStorageKey, modelId);
        notifyAIConfigChanged();
    }
}

export function setAIProviderAndModel(providerId, modelId = null) {
    localStorage.setItem('aiProvider', providerId);
    if (providerId === 'webai') {
        localStorage.setItem('webaiEnabled', 'true');
    }
    if (modelId) {
        const provider = getProviderConfig(providerId);
        if (provider) {
            localStorage.setItem(provider.modelStorageKey, modelId);
        }
    }
    notifyAIConfigChanged();
}

export function notifyAIConfigChanged() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ai-config-changed', {
            detail: { provider: getAIProvider(), model: getAIModel() },
        }));
    }
}

export function getActiveKey() {
    const provider = getAIProvider();
    if (provider === 'webai') return 'webai-local';
    const keyMap = {
        gemini: localStorage.getItem('geminiApiKey'),
        grok: localStorage.getItem('grokApiKey'),
        anthropic: localStorage.getItem('anthropicApiKey'),
        openai: localStorage.getItem('openaiApiKey'),
    };
    return (keyMap[provider] || '').trim();
}

/**
 * Returns true if the active AI provider is ready to use:
 * - For `webai`: true if the user activated WebAI (`webaiEnabled === 'true'`)
 * - For cloud providers: true if the user has saved a non-empty API key for that provider
 */
export function hasActiveKey() {
    const provider = getAIProvider();
    if (provider === 'webai') {
        return localStorage.getItem('webaiEnabled') === 'true';
    }
    return getActiveKey().length > 0;
}

export const isAIConfigured = hasActiveKey;

export function isWebAIActive() {
    return getAIProvider() === 'webai' && localStorage.getItem('webaiEnabled') === 'true';
}

export function getAIHeaders() {
    const provider = getAIProvider();
    const model = getAIModel(provider);
    const key = provider === 'webai' ? '' : getActiveKey();
    return {
        'x-ai-provider': provider,
        'x-ai-model': model,
        'x-ai-api-key': key,
        'x-gemini-api-key': provider === 'gemini' ? key : '',
    };
}

export function getProviderLabel(provider) {
    const labels = {
        webai: 'On-Device WebAI',
        gemini: 'Google Gemini',
        grok: 'xAI Grok',
        anthropic: 'Anthropic Claude',
        openai: 'OpenAI GPT',
    };
    return labels[provider] || provider;
}

export function getModelInfo(modelId) {
    return ALL_MODELS_MAP[modelId] || null;
}

export function getModelMeta(providerId, modelId) {
    if (modelId && ALL_MODELS_MAP[modelId]) {
        return ALL_MODELS_MAP[modelId];
    }
    const list = PROVIDER_MODELS[providerId] || [];
    return list.find(m => m.id === modelId) || list[0] || null;
}
