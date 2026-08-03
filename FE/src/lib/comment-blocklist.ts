export type BlockedCommentLanguage = "vi" | "ja";

export const COMMENT_BLOCKLIST_VI = [
  "dit",
  "dcm",
  "dmm",
  "dm",
  "deo",
  "dit me",
  "dit me may",
  "con me",
  "me may",
  "lon",
  "loz",
  "buoi",
  "cac",
  "vcl",
  "vl",
  "clm",
  "cmm",
  "fuck",
  "fucking",
  "fucker",
  "shit",
  "shitty",
  "bitch",
  "asshole",
  "sex",
  "porn",
  "xxx",
] as const;

export const COMMENT_BLOCKLIST_JA = [] as const;

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "2": "z",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  "@": "a",
  "$": "s",
  "!": "i",
  "+": "t",
  "|": "l",
  ".": "",
  ",": "",
  "-": "",
  "_": "",
  "*": "",
};

const BLOCKED_PATTERNS_VI = COMMENT_BLOCKLIST_VI.map((keyword) => [keyword, buildBlockedPattern(keyword)] as const);

function normalizeLegacyCommentText(value: string) {
  return value.normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g, "").replace(/[\p{P}\p{S}\s]+/gu, "").toLowerCase();
}

function matchesVietnameseBlocklist(comment: string) {
  const normalizedComment = normalizeCommentText(comment);
  const flattened = normalizedComment.replace(/[^a-z0-9]/g, "");

  for (const kw of COMMENT_BLOCKLIST_VI) {
    const nk = normalizeCommentText(kw).replace(/[^a-z0-9]/g, "");
    if (nk && flattened.includes(nk)) return true;
  }

  return BLOCKED_PATTERNS_VI.some(([, pattern]) => pattern.test(normalizedComment));
}

function matchesLegacyBlocklist(comment: string) {
  const normalizedComment = normalizeLegacyCommentText(comment);

  for (const keyword of COMMENT_BLOCKLIST_JA) {
    const normalizedKeyword = normalizeLegacyCommentText(keyword);
    if (normalizedKeyword && normalizedComment.includes(normalizedKeyword)) {
      return true;
    }
  }

  return false;
}

export function normalizeCommentText(value: string) {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[\u0111\u0110]/g, "d");

  return normalized
    .replace(/[0-9@!$+|]/g, (character) => LEET_MAP[character] ?? character)
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .toLowerCase();
}

export function containsBlockedKeyword(comment: string) {
  return matchesVietnameseBlocklist(comment) || matchesLegacyBlocklist(comment);
}

export function getBlockedCommentLanguages(comment: string): BlockedCommentLanguage[] {
  const languages: BlockedCommentLanguage[] = [];

  if (matchesVietnameseBlocklist(comment)) {
    languages.push("vi");
  }

  if (matchesLegacyBlocklist(comment)) {
    languages.push("ja");
  }

  return languages;
}

function buildBlockedPattern(keyword: string) {
  const normalizedKeyword = normalizeCommentText(keyword).replace(/[^a-z0-9\s]+/g, " ").replace(/\s+/g, " ").trim();

  if (!normalizedKeyword) {
    return new RegExp("$^");
  }

  const tokenPatterns = normalizedKeyword
    .split(" ")
    .filter(Boolean)
    .map((token) => [...token].map((character) => `${escapeRegExp(character)}+`).join("[^a-z0-9]*"));

  return new RegExp(`(^|[^a-z0-9])${tokenPatterns.join("[^a-z0-9]*")}([^a-z0-9]|$)`);
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
