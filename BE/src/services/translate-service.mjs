/**
 * translate-service.mjs
 * Auto-translation via DeepL Free API.
 * Free tier: 500,000 characters/month — https://www.deepl.com/pro-api
 * Set DEEPL_API_KEY in .env to enable. Without key, returns the original text gracefully.
 */

// Simple in-memory cache: key = `${text}|${targetLang}` → translated string
const translateCache = new Map();
const CACHE_MAX_SIZE = 500;

/**
 * Translate `text` to `targetLang` using DeepL Free API.
 * @param {string} text - Source text to translate.
 * @param {string} targetLang - BCP-47 / DeepL target language code (e.g. "EN", "VI").
 * @returns {{ translated: string, sourceLang: string|null, cached: boolean, error: string|null }}
 */
export async function translateText(text, targetLang = "EN") {
  if (!text || typeof text !== "string" || !text.trim()) {
    return { translated: text, sourceLang: null, cached: false, error: "empty_input" };
  }

  const apiKey = process.env.DEEPL_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    // No key configured — return original text with informational error
    return { translated: text, sourceLang: null, cached: false, error: "no_key" };
  }

  const normalizedLang = String(targetLang).toUpperCase().trim();
  const cacheKey = `${normalizedLang}|${text}`;

  const cached = translateCache.get(cacheKey);
  if (cached) {
    return { ...cached, cached: true };
  }

  // DeepL Free API endpoint (note the "-free" suffix in the domain)
  const isFreePlan = !String(apiKey).trim().endsWith(":fx")
    ? String(apiKey).trim().endsWith(":fx")
    : true;

  // DeepL free keys end with ":fx", paid keys don't
  const apiBase = String(apiKey).trim().endsWith(":fx")
    ? "https://api-free.deepl.com"
    : "https://api.deepl.com";

  try {
    const response = await fetch(`${apiBase}/v2/translate`, {
      method: "POST",
      headers: {
        Authorization: `DeepL-Auth-Key ${String(apiKey).trim()}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        text: text.trim(),
        target_lang: normalizedLang,
      }).toString(),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Translate] DeepL error ${response.status}:`, errText);
      return { translated: text, sourceLang: null, cached: false, error: `deepl_${response.status}` };
    }

    const payload = await response.json();
    const result = payload?.translations?.[0];
    if (!result) {
      return { translated: text, sourceLang: null, cached: false, error: "no_result" };
    }

    const out = {
      translated: result.text,
      sourceLang: result.detected_source_language ?? null,
      cached: false,
      error: null,
    };

    // Store in cache (LRU-lite: evict oldest when full)
    if (translateCache.size >= CACHE_MAX_SIZE) {
      const firstKey = translateCache.keys().next().value;
      translateCache.delete(firstKey);
    }
    translateCache.set(cacheKey, out);

    return out;
  } catch (error) {
    console.warn("[Translate] Fetch error:", error.message);
    return { translated: text, sourceLang: null, cached: false, error: "network_error" };
  }
}
