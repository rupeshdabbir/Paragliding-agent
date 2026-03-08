import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function run() {
    const generativeModel = ai.getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: 'application/json'
        },
    });

    const prompt = `You are an expert paragliding safety analyst. Analyze the following 7-day weather forecast for a specific site and produce a structured flyability verdict for EACH day.

SITE INFORMATION:
- Name: Mussel Rock aka The Dumps
- Launch Altitude: 121ft ASL
- Site Types registered: {"paragliding":true,"hanggliding":false,"thermaling":false,"ridgeSoaring":true,"winch":false}
- Takeoff Notes: From parking lot walk north 400 m to Walker, Lemmings or Jungle launches.
- Supported wind directions: W (ideal), NW (ideal), SW (ideal)

7-DAY WEATHER SUMMARY (daylight hours, 6am-8pm):
  2026-03-07: avg wind 12 mph from W, max gusts 15 mph, cloud 10%, precip 0.00 mm/h
  2026-03-08: avg wind 8 mph from NW, max gusts 10 mph, cloud 50%, precip 0.00 mm/h
  2026-03-09: avg wind 5 mph from E, max gusts 8 mph, cloud 10%, precip 0.00 mm/h
  2026-03-10: avg wind 15 mph from SW, max gusts 20 mph, cloud 80%, precip 0.10 mm/h
  2026-03-11: avg wind 20 mph from W, max gusts 25 mph, cloud 100%, precip 2.00 mm/h
  2026-03-12: avg wind 12 mph from NW, max gusts 16 mph, cloud 20%, precip 0.00 mm/h
  2026-03-13: avg wind 10 mph from W, max gusts 14 mph, cloud 0%, precip 0.00 mm/h

ANALYSIS TASK:
Respond with ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
{
  "days": [ { "date": "YYYY-MM-DD", "siteMode": "thermaling", "siteModeLabel": "...", "rating": "GO", "confidence": "high", "headline": "...", "reasoning": "1-3 sentences", "bestWindow": "e.g. '1pm-3pm'", "safetyNotes": [] } ]
}`;

    const res = await generativeModel.generateContent(prompt);
    const text = res.response.text();
    console.log("Finish reason:", res.response.candidates?.[0]?.finishReason);
    try {
        JSON.parse(text);
        console.log("JSON parsed successfully length:", text.length);
    } catch (e) {
        console.error("JSON parse error:", e.message);
    }
}
run();
