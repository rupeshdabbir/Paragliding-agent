# 🪂 SkyPilot — AI Paragliding Assistant

SkyPilot is a full-stack AI-powered paragliding conditions advisor. It helps pilots evaluate if conditions are safe to fly at paragliding sites near them. By combining real-time multi-altitude weather data from Open-Meteo, site characteristics from ParaglidingEarth, and the reasoning capabilities of Gemini, SkyPilot provides clear **GO / MARGINAL / NO-GO** assessments, interactive maps, and conversational advice.

## 📸 Screenshots & Walkthrough

| Map View & Controls | Forecast & Model Selection |
|----------|----------------------------|
| <img src="docs/assets/map.png" alt="Map View" width="400"/> | <img src="docs/assets/demo.webp" alt="Forecast Selection" width="400"/> |
| **Site Lookup & Detailed Forecast** | **Conversational Agent** |
| <img src="docs/assets/forecast_demo.webp" alt="Site Lookup" width="400"/> | <img src="docs/assets/chat.png" alt="Chat Interface" width="400"/> |

---

## 🚀 Features

- **Interactive Map & Search:** View nearby paragliding sites with color-coded markers based on current flyability, sporting a custom dark-mode theme. Find any site using the Nominatim geocoding API combined with ParaglidingEarth data, prioritizing localized results.
- **Favorites & Morning Brief:** Star your favorite paragliding sites and receive prioritized early morning summary assessments to start your day.
- **Hourly & 7-Day Forecasts:** Detailed breakdowns of wind by altitude (33ft, 262ft, 394ft, 591ft), wind direction, gusts, and weather conditions mapped to colorful gradients.
- **Multi-Provider AI Verdicts:** Full feature parity for 7-day extended forecasts and chat across Anthropic Claude, Grok, OpenAI, and Gemini. Choose your preferred AI provider to reliably analyze long-term flyability without rate-limit anxiety.
- **Model Selection:** Choose your preferred weather model: Auto (HRRR for North America + GFS/ECMWF globally), GFS, ECMWF, or ICON.
- **Site-Specific AI Chat:** A slide-out "Ask SkyPilot" drawer to chat about a specific site. Ask questions like "Can I fly Mussel Rock today?" or "When is the best window this week?" Features an engaging "Thinking" UI that provides visibility into the AI's processing stages.
- **Strict BRING YOUR OWN KEY (BYOK) Architecture:** The application operates on a strict BYOK model. Users can freely explore the interactive map and basic rule-based weather forecasts. Premium chat options and 7-day "AI Verdicts" are gated by an intuitive upsell that prompts the user to easily configure their own API keys (Gemini, Claude, Grok, or OpenAI) inside the Settings modal. *Keys are stored only in the browser's `localStorage` and are never saved to the server.*

---

## 🛠️ Developer Setup

This project uses a monorepo structure with a **React (Vite)** frontend and a **Node.js (Express)** backend.

### Prerequisites
- Node.js (v18+)
- A [Google Gemini API Key](https://aistudio.google.com/)

### 1. Clone & Set up Environment
Clone the repository. Because SkyPilot enforces a strict BYOK (Bring Your Own Key) model, **no server-side API keys are strictly required** to run the base application. Users provide their own keys via the web interface.

However, if you wish to set up default environment variables for local testing scripts, create an `.env` file in the **root** folder:

```bash
# In the root folder: Paragliding-agent/
touch .env
```

```env
PORT=3001

# Optional: For future vector database integrations
PINECONE_API_KEY=
PINECONE_INDEX=
```

### 2. Install Dependencies

Install dependencies for both the `client` and `server` folders.

```bash
# Terminal 1: Install Server Dependencies
cd server
npm install

# Terminal 2: Install Client Dependencies
cd client
npm install
```

### 3. Run the Development Servers

You will need to run both the frontend and backend servers simultaneously. The frontend handles proxies automatically via Vite to the backend on port `3001`.

```bash
# Terminal 1: Start the Backend (from project root)
cd server
npm run dev

# Terminal 2: Start the Frontend (from project root)
cd client
npm run dev
```

- **Frontend Application:** `http://localhost:5173`
- **Backend API:** `http://localhost:3001`

---

## 🏗️ Detailed Engineering & Architecture

SkyPilot leverages a tool-calling architecture in a Node.js Express server, hosting a LangChain-style function-calling loop wrapped around Google's `@google/generative-ai` SDK. When a user interacts with the app, the backend dynamically fetches and synthesizes data from multiple REST APIs.

### Key Architectural Decisions
- **Unified Rule Engines:** Flyability is determined by a dual-engine approach combining deterministic algorithms (Rule-Based Engine) and semantic LLM synthesis (AI-Based Engine). The AI-Based Engine acts as the supreme authority when an API Key is available.
- **Optimized AI Calls:** The AI weekly verdict analyzes all 7 days in a single LLM API call to reduce latency and token usage.
- **Caching Mechanism:** `node-cache` (on the server) and `localStorage` (in the browser) are heavily utilized to avoid redundant calls. ParaglidingEarth API responses are cached for 1 hour, Open-Meteo for 10 minutes, and multi-day AI verdicts for 6 hours.
- **Strict BYOK / Browser-Side API Keys:** Users input their own API Keys (Gemini, Anthropic, OpenAI, or Grok) in the UI. Keys are validated against the provider's API, saved securely into `localStorage`, injected into specific headers (e.g., `x-ai-api-key`), and sent to the backend for execution. The backend strictly enforces this: if no header is present, the AI layer is bypassed completely.
- **Fail-Safe Processing:** If a specific site fails to load or an API rate limit is reached, `try-catch` blocks ensure partial arrays are returned gracefully. API errors (like `429 Too Many Requests` or `401 Unauthorized`) are caught and translated into user-friendly UI warnings.

---

## 🧠 Dual Rule Engines for Flyability

SkyPilot uses two cooperating engines to determine whether a site is **GO**, **MARGINAL**, or **NO-GO**. 

### 1. Rule-Based Engine (Deterministic Validation & Free Tier)
Located in `utils/windUtils.js` and `tools/analyzeFlyingConditions.js`, this engine computes a safe baseline using hard math. It serves as the primary evaluation mechanism for users unauthenticated with an API key, delivering results straight to the UI.
- **Wind Speed & Gusts:** Checks 10m wind speeds against physical limits (e.g., > 18mph is generally a NO-GO, > 14mph is MARGINAL depending on site type).
- **Wind Direction Matching:** Checks if the current or forecasted wind direction (in degrees) falls within the site's acceptable launch angles from ParaglidingEarth. It scores the direction on a scale (0 to 1).
- **Environmental Factors:** Checks precipitation, visibility, and cloud cover to deduct points or outright flag a NO-GO.
- **Output:** Returns a quantitative summary composed of `rating`, `issues`, and `positives`.

### 2. AI-Based Rule Engine (Semantic & Contextual Analysis)
Located in `services/aiVerdict.js`, this engine utilizes `gemini-3-flash-preview` to add nuanced reasoning that raw math misses. It evaluates the holistic picture of the atmosphere and site topology rather than just threshold limits. If a user provides an API key, this evaluation dynamically runs on the backend, supplanting the Rule-Based engine's evaluation in the Forecast Panel.

- **Comprehensive Context:** It consumes the raw 7-day hourly weather data alongside site metadata (altitude, site types, acceptable wind directions).
- **Daily Syntheses:** For each day, the AI generates a qualitative assessment, providing a conversational `headline`, a detailed `reasoning` paragraph, and identifying the `bestWindow` of time for a flight.
- **Overrides:** The AI's verdict rating (GO/MARGINAL/NO-GO) supersedes the Rule-Based rating in the UI, ensuring that complex atmospheric subtleties are accounted for.
- **Graceful Fallback System:** By default, SkyPilot targets Google's `gemini-3-flash-preview` for supreme performance. However, to combat potential quota limitations (`429 Too Many Requests`), the agentic hook wraps completions in a hardened try/catch block. If `gemini-3` limits are hit, it transparently fails over to `gemini-2.5-flash` to complete the request without crashing the user interface, noting this fallback explicitly in a UI badge within the Chat Drawer.

#### AI Thought Process & Application Flow

To understand the AI Rule Engine, it is helpful to trace the data flow from the moment the user opens the application to the moment the AI returns a verdict.

**1. Application Load & Initial Data Fetch**

When the user lands on the application, the system quickly fetches the required data using the lightweight Rule-Based engine to populate the map before triggering the heavier AI engine dynamically on-demand. In the event a user has not configured a personal API key within the Settings, the app skips the AI fetch entirely and immediately prompts an upsell card that guides them to unlock AI usage. 

```mermaid
sequenceDiagram
    participant User
    participant MapUI as React MapView
    participant SiteAPI as Express /api/sites
    participant ForecastAPI as Express /api/forecast
    participant AI as aiVerdict (LLM Provider)
    
    User->>MapUI: Opens Application
    MapUI->>MapUI: Get User Location (Browser Geolocation)
    MapUI->>SiteAPI: GET /api/sites?lat=X&lng=Y
    Note over SiteAPI: Fetches sites & runs Rule-Based<br/>Engine for quick map markers
    SiteAPI-->>MapUI: Returns Sites (Color-coded pins)
    
    User->>MapUI: Clicks on a Paragliding Site Pin
    MapUI->>ForecastAPI: GET /api/forecast?siteLat=... (with 'x-ai-api-key' Header)
    Note over ForecastAPI: Fetches 7-Day Weather from Open-Meteo
    
    alt User Provided an API Key
        ForecastAPI->>AI: getAiWeeklyVerdicts(site, weather, apiKey, provider)
        AI-->>ForecastAPI: Returns 7 structured daily verdicts
        ForecastAPI-->>MapUI: Renders Premium Forecast Panel & AI Advice
    else User Lacks an API Key
        ForecastAPI-->>MapUI: Renders Fallback Rule-Based Forecast
        MapUI->>User: Renders Premium "Wake SkyPilot" Upsell Card
    end

```

**2. Inside the AI Rule Engine's "Brain"**

Once `aiVerdict.js` is invoked, it aggregates thousands of raw data points into a condensed format, structures a strict system prompt, and asks the selected LLM provider (Gemini, Anthropic, OpenAI, Grok) to perform expert-level semantic evaluation.

```mermaid
flowchart TD
    A[Raw 7-Day Hourly Weather] -->|Filter| B(Extract Daylight Hours Only)
    B --> C(Construct Daily Weather Summaries)
    
    S[Paragliding Site Data] --> D(Extract Altitude, Launch Angles, Type)
    
    C --> E{System Prompt Construction}
    D --> E
    
    E -->|1 Call for 7 Days| F((LLM Provider / JSON Mode))
    
    F -->|Analyze Mode| G{Determine Site Mode Flight Viability}
    G -->|Thermaling?| H[Check for heat + instability + light winds]
    G -->|Ridge Soaring?| I[Check for steady 10-25mph wind at ideal launch angle]
    G -->|Sled Ride?| J[Check for light winds, any direction]
    
    H & I & J --> K(Assign GO / MARGINAL / NO-GO)
    K --> L(Identify Best Flight Window 'e.g., 1pm-3pm')
    
    L -->|Format strict JSON| M[Return Structured 7-Day Verdict Array]
    M -->|Cache for 6 hours| N[Deliver to UI]
```

---

## 📜 API Documentation

### Weather & Site APIs
- **`GET /api/sites`**
  - **Query Params:** `lat`, `lng`, `distance`
  - **Description:** Returns all paragliding sites within the specified radius, enriched with current weather and rule-based GO/MARGINAL/NO-GO ratings.
  
- **`GET /api/forecast`**
  - **Query Params:** `lat`, `lng`, `siteLat` (optional), `siteLng` (optional), `models` (e.g., `best_match`)
  - **Headers:** `x-ai-provider`, `x-ai-api-key` (or legacy `x-gemini-api-key`)
  - **Description:** Returns a 7-day extended forecast with hourly wind arrays, a daily summary block, and full AI verdicts mapped by date.

- **`POST /api/validate`**
  - **Request Body:** `{ provider: "gemini", apiKey: "..." }`
  - **Description:** Performs a lightweight validation request against the selected provider to ensure the key is functional before saving to browser storage.

### Search API
- **`GET /api/search`**
  - **Query Params:** `q` (query string, e.g., "Mussel Rock"), `limit`
  - **Description:** Uses Nominatim geocoding to find raw coordinates, then performs a radial search in ParaglidingEarth. Additionally, performs fuzzy name-matching in a broader radius to ensure high-accuracy search results.

### Conversational API
- **`POST /api/chat`**
  - **Headers:** `x-ai-provider`, `x-ai-api-key` (or legacy `x-gemini-api-key`)
  - **Request Body:** `{ message: "...", history: [{role: "user"|"model", content: "..."}], location: {lat, lng} }`
  - **Description:** Agentic loop endpoint. The selected LLM can dynamically invoke local tools such as `analyze_flying_conditions` (which fetches weather and evaluates flyability) or `get_paragliding_sites` before returning a synthesized Markdown response to the user.

---

```mermaid
sequenceDiagram
    participant UI as React Map/UI
    participant API as Express /api/forecast
    participant PGE as ParaglidingEarth API
    participant OM as Open-Meteo API
    participant Engine as Dual Engines (Math + AI)

    UI->>API: GET /api/forecast?lat=...&lng=...&models=best_match
    
    par Data Fetching
        API->>PGE: Fetch closest sites & wind directions
        API->>OM: Fetch 7-day hourly wind, gusts, weather
    end
    
    API->>Engine: Pass Site & 7-Day Weather Data
    
    par Analysis
        Engine->>Engine: Run Mathematical Rule-Based Engine
        Engine->>Engine: Fetch Cached AI Verdicts (or call Gemini)
    end
    
    API-->>UI: Formatted JSON with Daily Summaries, Hourly Arrays, and AI Verdicts
    UI->>UI: Renders Charts, Badges, & AI Advice
```
