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
