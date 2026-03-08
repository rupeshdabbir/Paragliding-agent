/**
 * Reads the user's selected AI provider and API key from localStorage and
 * returns the correct request headers for all /api/* calls.
 *
 * Storage keys:
 *   aiProvider     → 'gemini' | 'grok' | 'anthropic' | 'openai'
 *   geminiApiKey   → key for Google Gemini
 *   grokApiKey     → key for xAI Grok
 *   anthropicApiKey→ key for Anthropic Claude
 *   openaiApiKey   → key for OpenAI GPT
 */
export const PROVIDERS = [
    {
        id: 'gemini',
        name: 'Gemini',
        company: 'Google',
        badge: 'Free tier',
        badgeColor: '#22c55e',
        accentColor: '#4285f4',
        gradient: 'linear-gradient(135deg, #4285f4, #34a853)',
        placeholder: 'AIzaSy...',
        storageKey: 'geminiApiKey',
        keyUrl: 'https://aistudio.google.com/app/apikey',
        keyLabel: 'Google AI Studio',
        modelHint: 'gemini-3-flash-preview',
        description: 'Recommended — free tier, full tool calling, AI forecasts',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M21.5 12a9.5 9.5 0 0 1-9.5 9.5A9.5 9.5 0 0 1 2.5 12 9.5 9.5 0 0 1 12 2.5 9.5 9.5 0 0 1 21.5 12ZM14.5 12.5l2.25 1.25-2.25 1.25L13.25 17.25l-1.25-2.25L9.75 13.75l2.25-1.25L13.25 9.5l1.25 3z" />
            </svg>
        ),
    },
    {
        id: 'grok',
        name: 'Grok',
        company: 'xAI',
        badge: 'Paid',
        badgeColor: '#a855f7',
        accentColor: '#7c3aed',
        gradient: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        placeholder: 'xai-...',
        storageKey: 'grokApiKey',
        keyUrl: 'https://console.x.ai/',
        keyLabel: 'xAI Console',
        modelHint: 'grok-3-mini',
        description: 'Ultra-fast responses, full tool calling — paid per call',
        icon: (
            <div style={{ fontSize: '1.4rem', lineHeight: 1, fontFamily: 'serif', fontWeight: 900, fontStyle: 'italic', letterSpacing: '-0.1em' }}>X</div>
        ),
    },
    {
        id: 'anthropic',
        name: 'Claude',
        company: 'Anthropic',
        badge: 'Paid',
        badgeColor: '#f59e0b',
        accentColor: '#d97706',
        gradient: 'linear-gradient(135deg, #d97706, #f59e0b)',
        placeholder: 'sk-ant-...',
        storageKey: 'anthropicApiKey',
        keyUrl: 'https://console.anthropic.com/',
        keyLabel: 'Anthropic Console',
        modelHint: 'claude-3-5-haiku-latest',
        description: 'Exceptional reasoning & safety analysis — paid per call',
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
        badge: 'Paid',
        badgeColor: '#10b981',
        accentColor: '#059669',
        gradient: 'linear-gradient(135deg, #059669, #10b981)',
        placeholder: 'sk-...',
        storageKey: 'openaiApiKey',
        keyUrl: 'https://platform.openai.com/api-keys',
        keyLabel: 'OpenAI Platform',
        modelHint: 'gpt-4.1-mini',
        description: 'Industry standard, reliable tool calling — paid per call',
        icon: (
            <svg viewBox="0 0 24 24" fill="currentColor" width="24" height="24">
                <path d="M22.28 11.23a8.88 8.88 0 0 0-1.84-6.42A8.85 8.85 0 0 0 13.9 1.5c-4.66 0-8.45 3.79-8.45 8.45 0 .72.1 1.42.27 2.1A8.88 8.88 0 0 0 7.56 18.5a8.85 8.85 0 0 0 6.54 3.32c4.66 0 8.45-3.79 8.45-8.45 0-.72-.1-1.42-.27-2.14zM12 2.58a7.35 7.35 0 0 1 5.37 2.4l-4.22 4.22-3.8-3.8A7.26 7.26 0 0 1 12 2.58zM4.6 10a7.35 7.35 0 0 1 2.4-5.37l3.8 3.8-1.5 1.5H4.81c-.13-.67-.21-1.35-.21-2.03zm7.4 11.42a7.35 7.35 0 0 1-5.37-2.4l4.22-4.22 3.8 3.8a7.26 7.26 0 0 1-2.65 2.82zm7.4-4.04c-.6.6-1.3 1.07-2.07 1.36l-3.8-3.8 1.5-1.5h4.48c.13.67.21 1.35.21 2.03a7.35 7.35 0 0 1-2.4 5.37v-3.46z" />
            </svg>
        ),
    },
];

export function getAIProvider() {
    return (localStorage.getItem('aiProvider') || 'gemini').toLowerCase();
}

export function getActiveKey() {
    const provider = getAIProvider();
    const keyMap = {
        gemini: localStorage.getItem('geminiApiKey'),
        grok: localStorage.getItem('grokApiKey'),
        anthropic: localStorage.getItem('anthropicApiKey'),
        openai: localStorage.getItem('openaiApiKey'),
    };
    return (keyMap[provider] || '').trim();
}

export function hasActiveKey() {
    return getActiveKey().length > 0;
}

export function getAIHeaders() {
    const provider = getAIProvider();
    const key = getActiveKey();
    return {
        'x-ai-provider': provider,
        'x-ai-api-key': key,
        // Keep legacy header for forecast route backward compat
        'x-gemini-api-key': provider === 'gemini' ? key : '',
    };
}

/**
 * Human-friendly label for the active provider.
 */
export function getProviderLabel(provider) {
    const labels = {
        gemini: 'Google Gemini',
        grok: 'xAI Grok',
        anthropic: 'Anthropic Claude',
        openai: 'OpenAI GPT',
    };
    return labels[provider] || provider;
}
