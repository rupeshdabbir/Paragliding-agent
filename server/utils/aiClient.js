/**
 * Unified AI client — multi-provider with full function/tool calling.
 *
 * Supports: gemini, grok (xAI), anthropic (Claude), openai (GPT)
 * Driven by server/config/aiCatalog.js so adding models requires zero edits here.
 */

import { getProviderFallbackChain, resolveProviderModel, isFallbackEligibleError } from '../config/aiCatalog.js';

const OPENAI_BASE_URLS = {
    openai: undefined, // use SDK default
    grok: 'https://api.x.ai/v1',
};

// ─── Tool declaration converters ──────────────────────────────────────────────

/**
 * Convert a Gemini-style function declaration to OpenAI tool format.
 */
export function toOpenAITool(decl) {
    return {
        type: 'function',
        function: {
            name: decl.name,
            description: decl.description,
            parameters: decl.parameters,
        },
    };
}

/**
 * Convert a Gemini-style function declaration to Anthropic tool format.
 */
export function toAnthropicTool(decl) {
    return {
        name: decl.name,
        description: decl.description,
        input_schema: decl.parameters,
    };
}

// ─── OpenAI / Grok agent loop ─────────────────────────────────────────────────

async function runOpenAIAgent({ provider, apiKey, systemPrompt, messages, toolDeclarations, toolHandlers, preferredModel }) {
    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
        apiKey,
        baseURL: OPENAI_BASE_URLS[provider],
    });
    const fallbackChain = getProviderFallbackChain(provider, preferredModel);
    const model = fallbackChain[0];

    const tools = toolDeclarations.map(toOpenAITool);

    const oaiMessages = [
        { role: 'system', content: systemPrompt },
        ...messages.map(m => ({
            role: m.role === 'model' ? 'assistant' : m.role,
            content: m.content,
        })),
    ];

    const toolResults = [];
    let maxIterations = 10;

    while (maxIterations-- > 0) {
        const response = await client.chat.completions.create({
            model,
            messages: oaiMessages,
            tools,
            tool_choice: 'auto',
        });

        const choice = response.choices[0];
        const assistantMsg = choice.message;
        oaiMessages.push(assistantMsg);

        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
            return {
                reply: assistantMsg.content || '',
                toolResults,
                usage: response.usage,
                usedModel: model,
            };
        }

        const toolResponses = await Promise.all(
            assistantMsg.tool_calls.map(async (toolCall) => {
                const { name } = toolCall.function;
                let args;
                try {
                    args = JSON.parse(toolCall.function.arguments);
                } catch {
                    args = {};
                }

                const handler = toolHandlers[name];
                if (!handler) {
                    toolResults.push({ tool: name, args, error: `Unknown tool: ${name}` });
                    return {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({ error: `Unknown tool: ${name}` }),
                    };
                }

                console.log(`[${provider}] Calling tool: ${name}`, args);
                try {
                    const result = await handler(args);
                    toolResults.push({ tool: name, args, result });
                    return {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify(result),
                    };
                } catch (err) {
                    console.error(`[${provider}] Tool error (${name}):`, err.message);
                    toolResults.push({ tool: name, args, error: err.message });
                    return {
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        content: JSON.stringify({ error: err.message }),
                    };
                }
            })
        );

        oaiMessages.push(...toolResponses);
    }

    return { reply: 'I reached the maximum number of reasoning steps. Please try again.', toolResults, usedModel: model };
}

// ─── Anthropic agent loop ─────────────────────────────────────────────────────

async function runAnthropicAgent({ apiKey, systemPrompt, messages, toolDeclarations, toolHandlers, preferredModel }) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const model = resolveProviderModel('anthropic', preferredModel);

    const tools = toolDeclarations.map(toAnthropicTool);

    const anthropicMessages = messages.map(m => ({
        role: m.role === 'model' ? 'assistant' : m.role,
        content: m.content,
    }));

    const toolResults = [];
    let maxIterations = 10;

    while (maxIterations-- > 0) {
        const response = await client.messages.create({
            model,
            max_tokens: 2048,
            system: systemPrompt,
            tools,
            messages: anthropicMessages,
        });

        anthropicMessages.push({ role: 'assistant', content: response.content });

        if (response.stop_reason === 'end_turn') {
            const textBlocks = response.content.filter(b => b.type === 'text');
            const reply = textBlocks.map(b => b.text).join('\n');
            return { reply, toolResults, usage: response.usage, usedModel: model };
        }

        if (response.stop_reason === 'tool_use') {
            const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');

            const toolResultBlocks = await Promise.all(
                toolUseBlocks.map(async (toolUse) => {
                    const { id, name, input } = toolUse;
                    const handler = toolHandlers[name];

                    if (!handler) {
                        toolResults.push({ tool: name, args: input, error: `Unknown tool: ${name}` });
                        return {
                            type: 'tool_result',
                            tool_use_id: id,
                            content: JSON.stringify({ error: `Unknown tool: ${name}` }),
                            is_error: true,
                        };
                    }

                    console.log(`[anthropic] Calling tool: ${name}`, input);
                    try {
                        const result = await handler(input);
                        toolResults.push({ tool: name, args: input, result });
                        return {
                            type: 'tool_result',
                            tool_use_id: id,
                            content: JSON.stringify(result),
                        };
                    } catch (err) {
                        console.error(`[anthropic] Tool error (${name}):`, err.message);
                        toolResults.push({ tool: name, args: input, error: err.message });
                        return {
                            type: 'tool_result',
                            tool_use_id: id,
                            content: JSON.stringify({ error: err.message }),
                            is_error: true,
                        };
                    }
                })
            );

            anthropicMessages.push({ role: 'user', content: toolResultBlocks });
        } else {
            const textBlocks = response.content.filter(b => b.type === 'text');
            const reply = textBlocks.map(b => b.text).join('\n');
            return { reply, toolResults, usage: response.usage, usedModel: model };
        }
    }

    return { reply: 'I reached the maximum number of reasoning steps. Please try again.', toolResults, usedModel: model };
}

// ─── Gemini agent loop ────────────────────────────────────────────────────────

async function runGeminiAgent({ apiKey, userMessage, history, userLocation, pilotProfile, preferredModel }) {
    const { runAgent } = await import('../services/gemini.js');
    return await runAgent({ userMessage, history, userLocation, apiKey, pilotProfile, preferredModel });
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function runProviderAgent({
    provider = 'gemini',
    apiKey = null,
    preferredModel = null,
    userMessage,
    history = [],
    userLocation = null,
    pilotProfile = null,
    systemPrompt,
    toolDeclarations,
    toolHandlers,
}) {
    switch (provider) {
        case 'gemini':
            return await runGeminiAgent({ apiKey, userMessage, history, userLocation, pilotProfile, preferredModel });

        case 'openai':
        case 'grok': {
            const messages = [
                ...history,
                { role: 'user', content: userMessage },
            ];
            return await runOpenAIAgent({ provider, apiKey, systemPrompt, messages, toolDeclarations, toolHandlers, preferredModel });
        }

        case 'anthropic': {
            const messages = [
                ...history,
                { role: 'user', content: userMessage },
            ];
            return await runAnthropicAgent({ apiKey, systemPrompt, messages, toolDeclarations, toolHandlers, preferredModel });
        }

        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
}
