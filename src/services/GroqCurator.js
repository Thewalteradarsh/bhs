const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;

/**
 * Defensive utility to interface with Groq API for AI Curation.
 * Implements strict JSON parsing and fallback error swallowing to prevent UI crashes.
 */
export async function fetchDailyMixes(languages, recentHistory) {
  if (!GROQ_API_KEY) {
    console.warn("[GroqCurator] Missing VITE_GROQ_API_KEY. Silently skipping AI curation.");
    return null;
  }

  // Format history for the AI
  const historyStr = recentHistory.map(t => `${t.name || t.title} by ${t.primaryArtists || t.artist}`).join(' | ');

  const systemPrompt = `
You are an expert music curation engine.
User Languages: ${languages.join(', ')}
Recently Played History: ${historyStr}

CRITICAL DIRECTIVE: Generate EXACTLY 2 custom, highly personalized playlists based on the user's history and languages. 
You MUST return ONLY a raw JSON array. Do not output markdown backticks, explanations, or any surrounding text.
The JSON array MUST exactly match this schema:
[
  {
    "id": "ai_mix_1",
    "category": "String (e.g. 'Late Night Melancholy')",
    "subtitle": "String (e.g. 'Vibes based on your recent plays')",
    "queries": [
       "Song Name Artist Name",
       "Song Name Artist Name",
       "Song Name Artist Name",
       "Song Name Artist Name",
       "Song Name Artist Name"
    ]
  }
]
`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama3-70b-8192',
        messages: [{ role: 'system', content: systemPrompt }],
        temperature: 0.6,
        response_format: { type: "json_object" } // Enforce JSON (Groq supports this for some models, but we'll manually parse anyway)
      })
    });

    if (!res.ok) throw new Error(`Groq API Network Error: ${res.status}`);
    
    const data = await res.json();
    let content = data.choices[0]?.message?.content;
    
    if (!content) throw new Error("Empty response from Groq.");

    // Defensive regex to strip markdown code block wrapping if hallucinated
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();

    const parsedData = JSON.parse(content);
    
    // Ensure array format even if Groq returned an object wrapper { "playlists": [...] }
    if (Array.isArray(parsedData)) {
      return parsedData;
    } else if (parsedData.playlists && Array.isArray(parsedData.playlists)) {
      return parsedData.playlists;
    } else {
      throw new Error("Parsed JSON does not contain a valid playlist array.");
    }

  } catch (error) {
    // Silently catch and log to prevent Dashboard crashes
    console.error("[GroqCurator] Hallucination, Parsing, or Network Error:", error);
    return null;
  }
}
