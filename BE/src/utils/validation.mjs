export function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

export function toNullableString(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  return String(value).trim();
}

export function toNullableNumber(value) {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid number: ${value}`);
  }

  return parsed;
}

export function toBoolean(value, fallback = false) {
  if (value === undefined) {
    return fallback;
  }

  return Boolean(value);
}

export function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

export function parseUuidParam(value, fieldName) {
  assert(isNonEmptyString(value), `${fieldName} is required.`);
  return value.trim();
}

export function sanitizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value;
}

