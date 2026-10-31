import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  degreesToCardinal,
  getSiteWindScore,
  isWindSpeedFlyable,
  scoreFlyingConditions,
} from '../utils/windUtils.js';
import { cache } from '../services/cache.js';
import {
  AI_PROVIDERS,
  AI_MODELS,
  getProviderFallbackChain,
  resolveProviderModel,
  isFallbackEligibleError,
} from '../config/aiCatalog.js';
import { getSites } from '../tools/getSites.js';
import { buildRuleBasedRegionalBrief } from '../services/aiVerdict.js';

describe('windUtils domain rules', () => {
  it('converts degrees to 8-point cardinal directions accurately', () => {
    assert.equal(degreesToCardinal(0), 'N');
    assert.equal(degreesToCardinal(45), 'NE');
    assert.equal(degreesToCardinal(90), 'E');
    assert.equal(degreesToCardinal(180), 'S');
    assert.equal(degreesToCardinal(270), 'W');
    assert.equal(degreesToCardinal(315), 'NW');
    assert.equal(degreesToCardinal(359), 'N');
  });

  it('scores site wind direction alignment (2 = good, 1 = marginal, 0 = off)', () => {
    const dirs = { W: 2, NW: 2, SW: 1 };
    assert.equal(getSiteWindScore(dirs, 270), 2);
    assert.equal(getSiteWindScore(dirs, 225), 1);
    assert.equal(getSiteWindScore(dirs, 90), 0);
  });

  it('evaluates wind speed and gusts for standard and ridge soaring sites', () => {
    const goodThermal = isWindSpeedFlyable(10, 14, { thermaling: true });
    assert.equal(goodThermal.flyable, true);
    assert.equal(goodThermal.category, 'MODERATE');

    const strongGusts = isWindSpeedFlyable(12, 26, { thermaling: true });
    assert.equal(strongGusts.flyable, false);
    assert.equal(strongGusts.category, 'DANGEROUS_GUSTS');

    const ridgeSoar = isWindSpeedFlyable(17, 21, { ridgeSoaring: true });
    assert.equal(ridgeSoar.flyable, true);
    assert.equal(ridgeSoar.category, 'MODERATE');
  });

  it('combines wind direction, speed, cloud cover, visibility, and rain into overall rating', () => {
    const windScore = 2;
    const windCheck = { flyable: true, category: 'MODERATE', reason: 'Ideal wind' };

    const goCond = scoreFlyingConditions({
      windScore,
      windCheck,
      cloudCover: 30,
      visibility: 10000,
      precipitation: 0,
    });
    assert.equal(goCond.rating, 'GO');

    const rainCond = scoreFlyingConditions({
      windScore,
      windCheck,
      cloudCover: 80,
      visibility: 10000,
      precipitation: 2.5,
    });
    assert.equal(rainCond.rating, 'NO_GO');
  });
});

describe('weather & site cache service', () => {
  it('supports composite string cache keys without NaN collision between 2-day and 7-day forecasts', () => {
    const key2d = '37.67,-122.49,best_match,2';
    const key7d = '37.67,-122.49,best_match,7';

    cache.setWeather(key2d, { days: 2 });
    cache.setWeather(key7d, { days: 7 });

    assert.deepEqual(cache.getWeather(key2d), { days: 2 });
    assert.deepEqual(cache.getWeather(key7d), { days: 7 });
  });

  it('maintains backward compatibility for numeric (lat, lng) arguments', () => {
    cache.setWeather(37.5, -122.1, { temp: 65 });
    assert.deepEqual(cache.getWeather(37.5, -122.1), { temp: 65 });
  });
});

describe('Declarative AI Model Catalog (aiCatalog.js)', () => {
  it('registers Gemini 3.7 Flash and Gemini 3.5 Flash-Lite with fallback chain', () => {
    assert.ok(AI_MODELS['gemini-3.7-flash']);
    assert.ok(AI_MODELS['gemini-3.5-flash-lite']);
    assert.ok(AI_MODELS['gemini-2.5-flash']);

    const chain = getProviderFallbackChain('gemini', 'gemini-3.5-flash-lite');
    assert.equal(chain[0], 'gemini-3.5-flash-lite');
    assert.ok(chain.includes('gemini-3.7-flash'));
    assert.ok(chain.includes('gemini-2.5-flash'));
  });

  it('registers client-side WebAI open-source models and Chrome Built-in Gemini Nano', () => {
    const webAiModels = Object.values(AI_MODELS)
      .filter((m) => m.providerId === 'webai')
      .map((m) => m.id);
    assert.ok(webAiModels.includes('chrome-built-in'));
    assert.ok(webAiModels.includes('Qwen2.5-3B-Instruct-q4f16_1-MLC'));
    assert.ok(webAiModels.includes('Hermes-3-Llama-3.2-3B-q4f16_1-MLC'));
    assert.ok(webAiModels.includes('Qwen2.5-1.5B-Instruct-q4f16_1-MLC'));
    assert.ok(webAiModels.includes('Phi-3.5-mini-instruct-q4f16_1-MLC'));
  });

  it('resolves preferred model or defaults cleanly across all providers', () => {
    assert.equal(resolveProviderModel('gemini', 'gemini-3.5-flash-lite'), 'gemini-3.5-flash-lite');
    assert.equal(resolveProviderModel('gemini', null), 'gemini-3.7-flash');
    assert.equal(resolveProviderModel('openai', 'gpt-4.1'), 'gpt-4.1');
  });

  it('identifies fallback-eligible model errors (404, 429, 503)', () => {
    assert.equal(isFallbackEligibleError(new Error('404 Model not found')), true);
    assert.equal(isFallbackEligibleError(new Error('503 Service Unavailable')), true);
    assert.equal(isFallbackEligibleError(new Error('401 Invalid API key')), false);
  });
});

describe('3-Tier Resilient Site Discovery (getSites.js)', () => {
  it('returns valid paragliding sites even when ParaglidingEarth is 503/403', async () => {
    const sites = await getSites({ lat: 37.6669, lng: -122.4939, distance: 60, limit: 10 });
    assert.ok(Array.isArray(sites));
    assert.ok(sites.length > 0, 'Expected at least 1 site from Overpass or curated fallback');

    const first = sites[0];
    assert.ok(typeof first.name === 'string' && first.name.length > 0);
    assert.ok(typeof first.lat === 'number' && !Number.isNaN(first.lat));
    assert.ok(typeof first.lng === 'number' && !Number.isNaN(first.lng));
    assert.ok(typeof first.windDirections === 'object');
  });
});

describe('Rule-based Regional Brief fallback (aiVerdict.js)', () => {
  it('builds a structured morning brief with sitesSummary for WebAI and no-key users', () => {
    const sampleSitesWithWeather = [
      {
        site: {
          name: 'Mussel Rock (Daly City)',
          altitude: 180,
          windDirections: { W: 2, NW: 2 },
        },
        weather: {
          hourly: {
            times: ['2026-10-31T10:00', '2026-10-31T12:00', '2026-10-31T14:00'],
            windSpeed10m: [12, 14, 13],
            windDirection10m: [280, 290, 285],
            windGusts: [16, 17, 16],
            precipitationProbability: [0, 0, 0],
            cloudCover: [20, 25, 20],
          },
        },
      },
    ];

    const brief = buildRuleBasedRegionalBrief(sampleSitesWithWeather);
    assert.ok(typeof brief.regionHeadline === 'string' && brief.regionHeadline.length > 0);
    assert.equal(brief.siteOfDay, 'Mussel Rock (Daly City)');
    assert.ok(Array.isArray(brief.rankings) && brief.rankings.length === 1);
    assert.equal(brief.rankings[0].siteName, 'Mussel Rock (Daly City)');
    assert.ok(Array.isArray(brief.sitesSummary) && brief.sitesSummary.length === 1);
  });
});
