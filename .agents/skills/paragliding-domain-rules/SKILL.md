---
name: paragliding-domain-rules
description: Domain reference for SkyPilot's paragliding meteorology, wind speed/gust limits, launch direction scoring, site discovery tiers, and caching conventions.
---

# Paragliding Domain Rules & Weather Conventions

Use this skill whenever working on `server/utils/windUtils.js`, `server/tools/`, `server/services/aiVerdict.js`, or `client/src/services/aiOrchestrator.js`.

## 1. Wind Speed & Gust Thresholds (`server/utils/windUtils.js`)

All wind speeds in SkyPilot are normalized to **mph** (Open-Meteo is queried with `wind_speed_unit: 'mph'`).

- **Standard / Thermaling Launch**:
  - Ideal: `4–15 mph` (`GO`)
  - Max flyable speed: `18 mph` (`15–18 mph` is `MARGINAL`)
  - Max gust speed: `22 mph`
  - Max gust spread (`gust - speed`): `10 mph` (`> 7 mph` is `MARGINAL`)
- **Ridge Soaring Launch (`siteTypes.ridgeSoaring = true`)**:
  - Ideal: `8–18 mph` (`GO`)
  - Max flyable speed: `22 mph`
  - Max gust speed: `26 mph`

## 2. Launch Wind Direction Scoring (`windDirections`)

Sites specify workable cardinal directions (`N`, `NE`, `E`, `SE`, `S`, `SW`, `W`, `NW`) with values:
- `2`: Good / primary launch direction (`windScore = 1.0`)
- `1`: Acceptable / cross-launch direction (`windScore = 0.6`)
- `0` or omitted: Unworkable / lee-side rotor hazard (`windScore = 0.0` -> `NO_GO`)

## 3. 3-Tier Site Discovery (`server/tools/getSites.js`)

Because ParaglidingEarth frequently blocks cloud IPs (HTTP 403) or undergoes maintenance (HTTP 503), `getSites.js` uses a 3-tier resilient pipeline:
1. **Tier 1**: ParaglidingEarth API (`http://www.paraglidingearth.com/api/geojson/getAroundLatLngSites.php`) with browser `User-Agent` and 3.5s timeout.
2. **Tier 2**: OpenStreetMap Overpass API (`sport=free_flying` nodes/ways within radius) merged with nearby curated sites.
3. **Tier 3**: Curated fallback database (`server/data/fallbackSites.json`) filtered by Haversine distance.

## 4. Weather Cache Key Convention (`server/services/cache.js`)

Always pass a composite key `${lat.toFixed(2)},${lng.toFixed(2)},${models},${forecastDays}` to `cache.getWeather(cacheKey)` and `cache.setWeather(cacheKey, data)` so 2-day chat weather lookups and 7-day forecast lookups never collide.
