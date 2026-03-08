/**
 * Unified AI client — multi-provider with full function/tool calling.
 *
 * Supports: gemini, grok (xAI), anthropic (Claude), openai (GPT)
 *
 * Each provider's tool-calling loop is fully implemented so all four give
 * an identical "agentic" experience — real-time site lookup, weather fetch,
 * and flying-conditions analysis, regardless of which key the user provides.
 */

import { getGenAI } from './geminiClient.js';

// ─── Provider constants ───────────────────────────────────────────────────────
const OPENAI_MODELS = {
    openai: 'gpt-4.1-mini',
    grok: 'grok-3-mini',
};
const ANTHROPIC_MODEL = 'claude-3-5-haiku-latest';

const OPENAI_BASE_URLS = {
    openai: undefined, // use SDK default
    grok: 'https://api.x.ai/v1',
};

// ─── Tool declaration converters ──────────────────────────────────────────────

/**
 * Convert a Gemini-style function declaration to OpenAI tool format.
 * Gemini declarations are already in JSON-Schema format, just wrap them.
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

/**
 * Run a full agentic tool-calling loop using the OpenAI-compatible API.
 * Works for both openai and grok providers.
 */
async function runOpenAIAgent({ provider, apiKey, systemPrompt, messages, toolDeclarations, toolHandlers, modelOverride }) {
    const { default: OpenAI } = await import('openai');

    const client = new OpenAI({
        apiKey,
        baseURL: OPENAI_BASE_URLS[provider],
    });
    const model = modelOverride || OPENAI_MODELS[provider];

    const tools = toolDeclarations.map(toOpenAITool);

    // Convert history to OpenAI message format
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

        // No tool calls — we have the final text response
        if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0) {
            return {
                reply: assistantMsg.content || '',
                toolResults,
                usage: response.usage,
                usedModel: model,
            };
        }

        // Execute all tool calls in parallel
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

        // Add all tool responses back to the message history
        oaiMessages.push(...toolResponses);
    }

    // Fallback if max iterations hit
    return { reply: 'I reached the maximum number of reasoning steps. Please try again.', toolResults, usedModel: model };
}

// ─── Anthropic agent loop ─────────────────────────────────────────────────────

/**
 * Run a full agentic tool-calling loop using the Anthropic API.
 */
async function runAnthropicAgent({ apiKey, systemPrompt, messages, toolDeclarations, toolHandlers, modelOverride }) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default;
    const client = new Anthropic({ apiKey });
    const model = modelOverride || ANTHROPIC_MODEL;

    const tools = toolDeclarations.map(toAnthropicTool);

    // Anthropic separates system prompt and has specific message format
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

        // Add assistant response to history
        anthropicMessages.push({ role: 'assistant', content: response.content });

        // Check stop reason
        if (response.stop_reason === 'end_turn') {
            // Extract text from content blocks
            const textBlocks = response.content.filter(b => b.type === 'text');
            const reply = textBlocks.map(b => b.text).join('\n');
            return { reply, toolResults, usage: response.usage, usedModel: model };
        }

        if (response.stop_reason === 'tool_use') {
            // Find all tool_use blocks
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

            // Add user message with all tool results
            anthropicMessages.push({ role: 'user', content: toolResultBlocks });
        } else {
            // Unexpected stop reason — return whatever text we have
            const textBlocks = response.content.filter(b => b.type === 'text');
            const reply = textBlocks.map(b => b.text).join('\n');
            return { reply, toolResults, usage: response.usage, usedModel: model };
        }
    }

    return { reply: 'I reached the maximum number of reasoning steps. Please try again.', toolResults, usedModel: model };
}

// ─── Gemini agent loop (delegates to existing gemini.js) ─────────────────────

/**
 * Thin wrapper — Gemini's full tool-calling agent is in services/gemini.js.
 * We call it through here so the public interface is uniform.
 */
async function runGeminiAgent({ apiKey, userMessage, history, userLocation, pilotProfile }) {
    // Dynamic import to avoid circular dependency
    const { runAgent } = await import('../services/gemini.js');
    return await runAgent({ userMessage, history, userLocation, apiKey, pilotProfile });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Run the SkyPilot agent for any provider with full tool calling.
 *
 * @param {object} opts
 * @param {'gemini'|'grok'|'openai'|'anthropic'} opts.provider
 * @param {string|null} opts.apiKey
 * @param {string} opts.userMessage
 * @param {Array} opts.history  - [{role: 'user'|'model', content: string}]
 * @param {object|null} opts.userLocation
 * @param {object|null} opts.pilotProfile
 * @param {string} opts.systemPrompt
 * @param {Array} opts.toolDeclarations  - Gemini-format declarations
 * @param {object} opts.toolHandlers     - { [name]: async (args) => result }
 * @returns {Promise<{reply, toolResults, usage, usedModel}>}
 */
export async function runProviderAgent({
    provider = 'gemini',
    apiKey = null,
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
            return await runGeminiAgent({ apiKey, userMessage, history, userLocation, pilotProfile });

        case 'openai':
        case 'grok': {
            // For non-Gemini providers we need flat conversation + current message appended
            const messages = [
                ...history,
                { role: 'user', content: userMessage },
            ];
            return await runOpenAIAgent({ provider, apiKey, systemPrompt, messages, toolDeclarations, toolHandlers });
        }

        case 'anthropic': {
            const messages = [
                ...history,
                { role: 'user', content: userMessage },
            ];
            return await runAnthropicAgent({ apiKey, systemPrompt, messages, toolDeclarations, toolHandlers });
        }

        default:
            throw new Error(`Unknown AI provider: ${provider}`);
    }
}
