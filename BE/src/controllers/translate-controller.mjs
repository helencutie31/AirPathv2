import { translateText } from "../services/translate-service.mjs";
import { assert, isNonEmptyString } from "../utils/validation.mjs";

const SUPPORTED_LANGS = new Set([
  "EN", "VI", "ZH", "JA", "KO", "FR", "DE", "ES", "PT", "IT",
  "RU", "NL", "PL", "TR", "AR", "ID",
]);

export async function translateController(body) {
  const text = body?.text;
  const targetLang = body?.targetLang ?? "EN";

  assert(isNonEmptyString(text), "text is required.");
  assert(text.length <= 5000, "text must be 5000 characters or fewer.");
  assert(
    SUPPORTED_LANGS.has(String(targetLang).toUpperCase()),
    `targetLang must be one of: ${[...SUPPORTED_LANGS].join(", ")}.`,
  );

  const result = await translateText(text, targetLang);
  return result;
}
