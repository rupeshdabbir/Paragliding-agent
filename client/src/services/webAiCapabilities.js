import { PROVIDER_MODELS } from '../utils/aiHeaders.jsx';

let cachedCapabilities = null;

/**
 * Inspects browser support for Chrome Built-in AI (Gemini Nano), WebGPU (WebLLM),
 * storage quota, and which WebLLM models are already cached in IndexedDB/CacheStorage.
 */
export async function detectWebAiCapabilities({ forceRefresh = false } = {}) {
  if (cachedCapabilities && !forceRefresh) {
    return cachedCapabilities;
  }

  const result = {
    chromeBuiltInStatus: 'unavailable', // 'available' | 'downloadable' | 'downloading' | 'unavailable'
    chromeBuiltInSupported: false,
    webGpuSupported: false,
    gpuVendor: null,
    gpuArchitecture: null,
    maxStorageBufferMB: 0,
    maxBufferMB: 0,
    storageQuotaMB: 0,
    storageUsageMB: 0,
    storageFreeMB: 0,
    cachedModels: {},
    recommendedModelId: 'Qwen2.5-3B-Instruct-q4f16_1-MLC',
    recommendationReason: 'Best overall balance of structured JSON accuracy, reasoning, and 1.9 GB download size',
    anySupported: false,
  };

  // 1. Check Chrome Built-in AI (Prompt API: self.LanguageModel)
  try {
    if (typeof self !== 'undefined' && 'LanguageModel' in self && typeof self.LanguageModel?.availability === 'function') {
      const status = await self.LanguageModel.availability();
      result.chromeBuiltInStatus = status || 'unavailable';
      result.chromeBuiltInSupported = status === 'available' || status === 'downloadable' || status === 'downloading';
      if (status === 'available') {
        result.cachedModels['chrome-built-in'] = true;
      }
    }
  } catch {
    result.chromeBuiltInStatus = 'unavailable';
    result.chromeBuiltInSupported = false;
  }

  // 2. Check WebGPU support & limits
  try {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator && typeof navigator.gpu?.requestAdapter === 'function') {
      const adapter = await navigator.gpu.requestAdapter();
      if (adapter) {
        result.webGpuSupported = true;
        const maxStorageBinding = adapter.limits?.maxStorageBufferBindingSize || 0;
        const maxBuffer = adapter.limits?.maxBufferSize || 0;
        result.maxStorageBufferMB = Math.round(maxStorageBinding / (1024 * 1024));
        result.maxBufferMB = Math.round(maxBuffer / (1024 * 1024));

        if (adapter.info) {
          result.gpuVendor = adapter.info.vendor || null;
          result.gpuArchitecture = adapter.info.architecture || adapter.info.description || null;
        }
      }
    }
  } catch {
    result.webGpuSupported = false;
  }

  // 3. Check browser Storage Quota
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && typeof navigator.storage.estimate === 'function') {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 0;
      const usage = estimate.usage || 0;
      result.storageQuotaMB = Math.round(quota / (1024 * 1024));
      result.storageUsageMB = Math.round(usage / (1024 * 1024));
      result.storageFreeMB = Math.max(0, result.storageQuotaMB - result.storageUsageMB);
    }
  } catch {
    // Ignore storage estimate failure
  }

  // 4. Check which WebLLM models are already cached in the browser
  if (result.webGpuSupported) {
    try {
      const { hasModelInCache } = await import('@mlc-ai/web-llm');
      const webAiModels = PROVIDER_MODELS.webai || [];
      await Promise.all(
        webAiModels
          .filter(m => m.executionMode === 'client-webgpu')
          .map(async (m) => {
            try {
              const isCached = await hasModelInCache(m.id);
              result.cachedModels[m.id] = Boolean(isCached);
            } catch {
              result.cachedModels[m.id] = false;
            }
          })
      );
    } catch {
      // Ignore cache inspection error
    }
  }

  // 5. Compute Hardware-Aware Model Recommendation
  result.anySupported = result.chromeBuiltInSupported || result.webGpuSupported;

  if (result.cachedModels['Qwen2.5-3B-Instruct-q4f16_1-MLC']) {
    result.recommendedModelId = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
    result.recommendationReason = 'Already cached on your device & highest accuracy for structured aviation forecasts';
  } else if (result.chromeBuiltInStatus === 'available') {
    result.recommendedModelId = 'chrome-built-in';
    result.recommendationReason = 'Chrome Built-in Gemini Nano is already installed on your browser (0 MB download)';
  } else if (result.webGpuSupported) {
    const isLowMemory = result.maxBufferMB > 0 && result.maxBufferMB < 1024;
    if (isLowMemory) {
      result.recommendedModelId = 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC';
      result.recommendationReason = 'Ultra-lightweight 1.0 GB model tailored for your GPU memory limits';
    } else {
      result.recommendedModelId = 'Qwen2.5-3B-Instruct-q4f16_1-MLC';
      result.recommendationReason = 'Top-rated open-source 3B model for structured JSON weather verdicts (1.9 GB cached once)';
    }
  } else if (result.chromeBuiltInSupported) {
    result.recommendedModelId = 'chrome-built-in';
    result.recommendationReason = 'Uses Chrome Built-in Gemini Nano';
  }

  cachedCapabilities = result;
  return result;
}
