import { getAIModel } from '../utils/aiHeaders.jsx';
import { detectWebAiCapabilities } from './webAiCapabilities.js';

let mlcWorker = null;
let mlcEngine = null;
let loadedMlcModelId = null;
let loadingPromise = null;
let loadingModelId = null;

const state = {
  status: 'idle', // 'idle' | 'loading' | 'ready' | 'generating' | 'error'
  activeModelId: null,
  progress: 0, // 0..1
  progressText: '',
  error: null,
};

const listeners = new Set();

function updateState(patch) {
  Object.assign(state, patch);
  for (const listener of listeners) {
    try {
      listener({ ...state });
    } catch {
      // ignore listener errors
    }
  }
}

export function getWebAiState() {
  return { ...state };
}

export function subscribeWebAiState(listener) {
  listeners.add(listener);
  listener({ ...state });
  return () => listeners.delete(listener);
}

/**
 * Resolves the effective WebAI model ID to load.
 * If 'chrome-built-in' is selected on a browser without Prompt API support,
 * automatically falls back to Qwen 2.5 3B on WebGPU if available.
 */
async function resolveExecutableWebAiModel(requestedModelId) {
  const modelId = requestedModelId || getAIModel('webai') || 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
  if (modelId === 'chrome-built-in') {
    const caps = await detectWebAiCapabilities();
    if (caps.chromeBuiltInSupported) {
      return 'chrome-built-in';
    }
    if (caps.webGpuSupported) {
      return caps.recommendedModelId !== 'chrome-built-in'
        ? caps.recommendedModelId
        : 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
    }
    throw new Error(
      'Chrome Built-in AI (Gemini Nano) is not enabled in this browser and WebGPU is unavailable. Enable Chrome Built-in AI flags or switch to a Cloud API key in Settings.'
    );
  }
  return modelId;
}

/**
 * Ensures the specified WebAI model is loaded and ready for inference.
 */
export async function ensureModelLoaded(requestedModelId) {
  const modelId = await resolveExecutableWebAiModel(requestedModelId);

  if (modelId === 'chrome-built-in') {
    updateState({
      status: 'loading',
      activeModelId: 'chrome-built-in',
      progress: 0.2,
      progressText: 'Checking Chrome Built-in Gemini Nano...',
      error: null,
    });

    if (!('LanguageModel' in self) || typeof self.LanguageModel?.availability !== 'function') {
      const err = new Error('Chrome Built-in AI (self.LanguageModel) is not supported in this browser.');
      updateState({ status: 'error', error: err.message });
      throw err;
    }

    const availability = await self.LanguageModel.availability();
    if (availability === 'unavailable') {
      const err = new Error('Chrome Built-in Gemini Nano is unavailable on this device.');
      updateState({ status: 'error', error: err.message });
      throw err;
    }

    updateState({
      status: 'ready',
      activeModelId: 'chrome-built-in',
      progress: 1,
      progressText: 'Chrome Built-in Gemini Nano ready (0 MB download)',
      error: null,
    });
    return { type: 'chrome-built-in', modelId: 'chrome-built-in' };
  }

  // WebLLM via WebGPU Worker
  if (mlcEngine && loadedMlcModelId === modelId) {
    updateState({
      status: 'ready',
      activeModelId: modelId,
      progress: 1,
      progressText: `${modelId} ready in WebGPU memory`,
      error: null,
    });
    return { type: 'webllm', engine: mlcEngine, modelId };
  }

  if (loadingPromise && loadingModelId === modelId) {
    return loadingPromise;
  }

  loadingModelId = modelId;
  loadingPromise = (async () => {
    try {
      const caps = await detectWebAiCapabilities();
      if (!caps.webGpuSupported) {
        throw new Error(
          'WebGPU is not supported or enabled in your browser. Please use Chrome/Edge 113+ or Safari 18+, or configure a Cloud API key in Settings.'
        );
      }

      updateState({
        status: 'loading',
        activeModelId: modelId,
        progress: 0.02,
        progressText: `Initializing WebGPU engine for ${modelId}...`,
        error: null,
      });

      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');

      const onProgress = (report) => {
        const pct = typeof report.progress === 'number' ? report.progress : 0;
        updateState({
          status: 'loading',
          activeModelId: modelId,
          progress: pct,
          progressText: report.text || `Loading ${modelId} (${Math.round(pct * 100)}%)...`,
          error: null,
        });
      };

      if (!mlcWorker) {
        mlcWorker = new Worker(new URL('../workers/webLlmWorker.js', import.meta.url), {
          type: 'module',
        });
      }

      if (!mlcEngine) {
        mlcEngine = await CreateWebWorkerMLCEngine(mlcWorker, modelId, {
          initProgressCallback: onProgress,
        });
      } else {
        mlcEngine.setInitProgressCallback(onProgress);
        await mlcEngine.reload(modelId);
      }

      loadedMlcModelId = modelId;
      await detectWebAiCapabilities({ forceRefresh: true });

      updateState({
        status: 'ready',
        activeModelId: modelId,
        progress: 1,
        progressText: `${modelId} ready on WebGPU`,
        error: null,
      });

      return { type: 'webllm', engine: mlcEngine, modelId };
    } catch (err) {
      loadedMlcModelId = null;
      updateState({
        status: 'error',
        activeModelId: modelId,
        progress: 0,
        progressText: '',
        error: err.message || 'Failed to initialize WebAI model',
      });
      throw err;
    } finally {
      loadingPromise = null;
      loadingModelId = null;
    }
  })();

  return loadingPromise;
}

/**
 * Helper to strip markdown code fences and extract valid JSON.
 */
function parseJsonSafely(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Empty response from local AI model');
  }
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
    }
    throw new Error('Local AI model returned malformed JSON');
  }
}

/**
 * Generates structured JSON output from either Chrome Built-in AI (`responseConstraint`)
 * or WebLLM (`response_format: { type: 'json_object' }`).
 */
export async function generateStructuredJson({
  modelId: requestedModelId,
  systemPrompt,
  userPrompt,
  schema,
  temperature = 0.2,
  maxTokens = 900,
}) {
  const loaded = await ensureModelLoaded(requestedModelId);
  updateState({
    status: 'generating',
    activeModelId: loaded.modelId,
    progressText: `Running on-device inference (${loaded.modelId})...`,
  });

  try {
    if (loaded.type === 'chrome-built-in') {
      let session = null;
      try {
        session = await self.LanguageModel.create({
          initialPrompts: systemPrompt
            ? [{ role: 'system', content: systemPrompt }]
            : undefined,
          monitor(m) {
            m.addEventListener('downloadprogress', (e) => {
              const pct = e.total ? e.loaded / e.total : e.loaded || 0;
              updateState({
                status: 'loading',
                activeModelId: 'chrome-built-in',
                progress: pct,
                progressText: `Downloading Gemini Nano (${Math.round(pct * 100)}%)...`,
              });
            });
          },
        });
        const promptOptions = schema ? { responseConstraint: schema } : undefined;
        const raw = await session.prompt(userPrompt, promptOptions);
        return {
          data: parseJsonSafely(raw),
          usedModel: 'chrome-built-in',
        };
      } finally {
        if (session && typeof session.destroy === 'function') {
          session.destroy();
        }
      }
    }

    // WebLLM JSON mode
    const messages = [];
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userPrompt });

    const response = await loaded.engine.chat.completions.create({
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
    });

    const raw = response.choices?.[0]?.message?.content || '{}';
    return {
      data: parseJsonSafely(raw),
      usedModel: loaded.modelId,
    };
  } finally {
    updateState({
      status: 'ready',
      activeModelId: loaded.modelId,
      progress: 1,
      progressText: `${loaded.modelId} ready`,
    });
  }
}

/**
 * Runs a streaming chat completion on-device.
 */
export async function generateChatStream({
  modelId: requestedModelId,
  messages,
  temperature = 0.4,
  maxTokens = 700,
  onChunk,
}) {
  const loaded = await ensureModelLoaded(requestedModelId);
  updateState({
    status: 'generating',
    activeModelId: loaded.modelId,
    progressText: `Generating response (${loaded.modelId})...`,
  });

  try {
    if (loaded.type === 'chrome-built-in') {
      let session = null;
      try {
        const systemMsg = messages.find((m) => m.role === 'system');
        const nonSystem = messages.filter((m) => m.role !== 'system');
        const historyPrompts = nonSystem.slice(0, -1).map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        }));
        const latestUserMsg = nonSystem[nonSystem.length - 1]?.content || '';

        const initialPrompts = [];
        if (systemMsg) initialPrompts.push({ role: 'system', content: systemMsg.content });
        initialPrompts.push(...historyPrompts);

        session = await self.LanguageModel.create({
          initialPrompts: initialPrompts.length > 0 ? initialPrompts : undefined,
        });

        let fullText = '';
        if (typeof session.promptStreaming === 'function') {
          const stream = session.promptStreaming(latestUserMsg);
          for await (const chunk of stream) {
            // Depending on Chrome version, chunk may be cumulative or delta
            const delta = chunk.startsWith(fullText) ? chunk.slice(fullText.length) : chunk;
            fullText += delta;
            if (onChunk) onChunk(delta, fullText);
          }
        } else {
          fullText = await session.prompt(latestUserMsg);
          if (onChunk) onChunk(fullText, fullText);
        }

        return { reply: fullText, usedModel: 'chrome-built-in' };
      } finally {
        if (session && typeof session.destroy === 'function') {
          session.destroy();
        }
      }
    }

    // WebLLM streaming chat
    const chunks = await loaded.engine.chat.completions.create({
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    let fullText = '';
    for await (const chunk of chunks) {
      const delta = chunk.choices?.[0]?.delta?.content || '';
      if (delta) {
        fullText += delta;
        if (onChunk) onChunk(delta, fullText);
      }
    }

    return {
      reply: fullText || 'No response generated.',
      usedModel: loaded.modelId,
    };
  } finally {
    updateState({
      status: 'ready',
      activeModelId: loaded.modelId,
      progress: 1,
      progressText: `${loaded.modelId} ready`,
    });
  }
}

/**
 * Deletes a cached WebLLM model from browser storage (IndexedDB / Cache Storage)
 * and unloads it if active.
 */
export async function deleteCachedModel(modelId) {
  if (!modelId || modelId === 'chrome-built-in') return;

  const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
  if (mlcEngine && loadedMlcModelId === modelId) {
    try {
      await mlcEngine.unload();
    } catch {
      // ignore unload error
    }
    loadedMlcModelId = null;
    updateState({
      status: 'idle',
      activeModelId: null,
      progress: 0,
      progressText: '',
    });
  }
  await deleteModelAllInfoInCache(modelId);
  return detectWebAiCapabilities({ forceRefresh: true });
}
