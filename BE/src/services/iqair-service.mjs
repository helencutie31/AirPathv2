import { sql } from "../db.mjs";

const iqAirMeasurementCache = new Map();
const iqAirBackoffCache = new Map();
const iqAirStaleCache = new Map();

const IQAIR_CACHE_TTL_MS = 15 * 60 * 1000;
const IQAIR_BACKOFF_MS = 5 * 60 * 1000;
const IQAIR_STALE_TTL_MS = 12 * 60 * 60 * 1000;

function getCacheKey(lat, lng) {
  return `${Number(lat).toFixed(4)}|${Number(lng).toFixed(4)}`;
}

function isRateLimitError(error) {
  return error instanceof Error && /status 429/i.test(error.message);
}

export async function fetchIqAirMeasurement(lat, lng) {
  const cacheKey = getCacheKey(lat, lng);
  const cached = iqAirMeasurementCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise;
  }

  const backoff = iqAirBackoffCache.get(cacheKey);
  if (backoff && backoff.expiresAt > Date.now()) {
    const stale = iqAirStaleCache.get(cacheKey);
    if (stale && stale.expiresAt > Date.now()) {
      return Promise.resolve(stale.measurement);
    }
    const dbFallback = await fetchNearestDatabaseMeasurement(lat, lng);
    if (dbFallback) {
      return dbFallback;
    }
  }

  const promise = fetchIqAirMeasurementFresh(lat, lng, cacheKey);

  iqAirMeasurementCache.set(cacheKey, {
    expiresAt: Date.now() + IQAIR_CACHE_TTL_MS,
    promise,
  });

  promise.then((measurement) => {
    const current = iqAirMeasurementCache.get(cacheKey);
    if (current?.promise === promise) {
      iqAirMeasurementCache.set(cacheKey, {
        expiresAt: Date.now() + IQAIR_CACHE_TTL_MS,
        promise: Promise.resolve(measurement),
        measurement,
      });
      iqAirStaleCache.set(cacheKey, {
        expiresAt: Date.now() + IQAIR_STALE_TTL_MS,
        measurement,
      });
    }
  });

  promise.catch(async (error) => {
    const current = iqAirMeasurementCache.get(cacheKey);
    if (current?.promise === promise) {
      iqAirMeasurementCache.delete(cacheKey);
    }

    if (isRateLimitError(error)) {
      iqAirBackoffCache.set(cacheKey, {
        expiresAt: Date.now() + IQAIR_BACKOFF_MS,
      });

      const stale = iqAirStaleCache.get(cacheKey);
      if (stale && stale.expiresAt > Date.now()) {
        return;
      }

      const dbFallback = await fetchNearestDatabaseMeasurement(lat, lng);
      if (dbFallback) {
        iqAirStaleCache.set(cacheKey, {
          expiresAt: Date.now() + IQAIR_STALE_TTL_MS,
          measurement: dbFallback,
        });
      }
    }
  });

  return promise;
}

async function fetchIqAirMeasurementFresh(lat, lng, cacheKey) {
  const apiKey = process.env.IQAIR_API_KEY;
  if (!apiKey || !String(apiKey).trim()) {
    // IQAir key missing — try AQICN then DB
    console.warn("[AQI] IQAIR_API_KEY missing, trying AQICN fallback.");
    const aqicn = await fetchAqicnMeasurement(lat, lng);
    if (aqicn) return aqicn;
    const db = await fetchNearestDatabaseMeasurement(lat, lng);
    if (db) return db;
    throw new Error("Missing IQAIR_API_KEY on server and no fallback data available.");
  }

  const iqAirUrl = new URL("https://api.airvisual.com/v2/nearest_city");
  iqAirUrl.searchParams.set("lat", String(lat));
  iqAirUrl.searchParams.set("lon", String(lng));
  iqAirUrl.searchParams.set("key", String(apiKey).trim());

  let response;
  try {
    response = await fetch(iqAirUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
  } catch (networkError) {
    // Network-level error — try AQICN backup
    console.warn("[AQI] IQAir network error, trying AQICN:", networkError.message);
    const aqicn = await fetchAqicnMeasurement(lat, lng);
    if (aqicn) return aqicn;
    const db = await fetchNearestDatabaseMeasurement(lat, lng);
    if (db) return db;
    throw networkError;
  }

  if (!response.ok) {
    if (response.status === 429) {
      const stale = iqAirStaleCache.get(cacheKey);
      if (stale && stale.expiresAt > Date.now()) {
        return stale.measurement;
      }

      const dbFallback = await fetchNearestDatabaseMeasurement(lat, lng);
      if (dbFallback) {
        return dbFallback;
      }

      iqAirBackoffCache.set(cacheKey, {
        expiresAt: Date.now() + IQAIR_BACKOFF_MS,
      });
    } else {
      // Non-429 HTTP errors — try AQICN backup
      console.warn(`[AQI] IQAir returned ${response.status}, trying AQICN fallback.`);
      const aqicn = await fetchAqicnMeasurement(lat, lng);
      if (aqicn) return aqicn;
      const db = await fetchNearestDatabaseMeasurement(lat, lng);
      if (db) return db;
    }

    throw new Error(`IQAir request failed with status ${response.status}.`);
  }

  const payload = await response.json();
  if (payload?.status !== "success") {
    const stale = iqAirStaleCache.get(cacheKey);
    if (stale && stale.expiresAt > Date.now()) {
      return stale.measurement;
    }

    // IQAir returned error payload — try AQICN backup
    console.warn("[AQI] IQAir returned non-success status, trying AQICN fallback.");
    const aqicn = await fetchAqicnMeasurement(lat, lng);
    if (aqicn) return aqicn;

    const dbFallback = await fetchNearestDatabaseMeasurement(lat, lng);
    if (dbFallback) {
      return dbFallback;
    }

    throw new Error(payload?.data?.message || payload?.message || "IQAir returned an error.");
  }

  const cityData = payload?.data ?? {};
  const pollution = cityData?.current?.pollution ?? {};
  const weather = cityData?.current?.weather ?? {};
  const coordinates = cityData?.location?.coordinates;

  const measurement = {
    aqi: toNullableNumber(pollution?.aqius),
    measured_at: toNullableString(pollution?.ts),
    source: "IQAir",
    location_name:
      [cityData?.city, cityData?.state, cityData?.country].filter(Boolean).join(", ") ||
      "Nearest city",
    lat: Array.isArray(coordinates) && typeof coordinates[1] === "number" ? coordinates[1] : Number(lat),
    lng: Array.isArray(coordinates) && typeof coordinates[0] === "number" ? coordinates[0] : Number(lng),
    main_pollutant: toNullableString(pollution?.mainus),
    aqicn: toNullableNumber(pollution?.aqicn),
    temperature: toNullableNumber(weather?.tp),
    humidity: toNullableNumber(weather?.hu),
    wind_speed: toNullableNumber(weather?.ws),
  };

  iqAirMeasurementCache.set(cacheKey, {
    expiresAt: Date.now() + IQAIR_CACHE_TTL_MS,
    promise: Promise.resolve(measurement),
    measurement,
  });
  iqAirStaleCache.set(cacheKey, {
    expiresAt: Date.now() + IQAIR_STALE_TTL_MS,
    measurement,
  });

  return measurement;
}

/**
 * Direct AQICN fetch — exported for the /api/aqi/aqicn endpoint.
 * Uses the same logic as the internal fallback.
 */
export async function fetchAqicnMeasurementDirect(lat, lng) {
  return fetchAqicnMeasurement(lat, lng);
}

/**
 * Fallback: fetch AQI from AQICN (waqi.info) using geo-based feed.
 * Requires AQICN_TOKEN env variable (free tier: https://aqicn.org/api/).
 * Returns null if token missing or request fails — silently skipped.
 */
async function fetchAqicnMeasurement(lat, lng) {
  const token = process.env.AQICN_TOKEN;
  if (!token || !String(token).trim()) {
    return null;
  }

  try {
    const url = `https://api.waqi.info/feed/geo:${lat};${lng}/?token=${encodeURIComponent(String(token).trim())}`;
    const response = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      console.warn(`[AQICN] Request failed with status ${response.status}`);
      return null;
    }

    const payload = await response.json();
    if (payload?.status !== "ok" || payload?.data === "Unknown station") {
      console.warn("[AQICN] Non-ok response:", payload?.status);
      return null;
    }

    const data = payload.data ?? {};
    const aqiValue = typeof data.aqi === "number" ? data.aqi : toNullableNumber(data.aqi);
    const cityName = data.city?.name ?? null;
    const iaqi = data.iaqi ?? {};

    return {
      aqi: aqiValue,
      measured_at: data.time?.iso ?? new Date().toISOString(),
      source: "AQICN",
      location_name: cityName || "AQICN station",
      lat: toNullableNumber(data.city?.geo?.[0]) ?? Number(lat),
      lng: toNullableNumber(data.city?.geo?.[1]) ?? Number(lng),
      main_pollutant: null,
      aqicn: aqiValue,
      temperature: toNullableNumber(iaqi.t?.v),
      humidity: toNullableNumber(iaqi.h?.v),
      wind_speed: toNullableNumber(iaqi.w?.v),
    };
  } catch (error) {
    console.warn("[AQICN] Fetch error:", error.message);
    return null;
  }
}

async function fetchNearestDatabaseMeasurement(lat, lng) {
  const [row] = await sql`
    select
      m.aqi,
      m.measured_at,
      l.name as location_name,
      l.lat,
      l.lng
    from airpath.aqi_measurements m
    join airpath.locations l on l.id = m.location_id
    order by power(l.lat - ${lat}, 2) + power(l.lng - ${lng}, 2), m.measured_at desc
    limit 1
  `;

  if (!row) {
    return {
      aqi: 120,
      measured_at: new Date().toISOString(),
      source: "DB_DEFAULT",
      location_name: "Tòa B1 Đại học Bách khoa Hà Nội",
      lat: 21.0041,
      lng: 105.8428,
      main_pollutant: null,
      aqicn: null,
      temperature: null,
      humidity: null,
      wind_speed: null,
    };
  }

  return {
    aqi: toNullableNumber(row.aqi) ?? 120, // Default fallback AQI
    measured_at: toNullableString(row.measured_at) ?? new Date().toISOString(),
    source: "DB",
    location_name: row.location_name ?? "Tòa B1 Đại học Bách khoa Hà Nội",
    lat: toNullableNumber(row.lat) ?? 21.0041,
    lng: toNullableNumber(row.lng) ?? 105.8428,
    main_pollutant: null,
    aqicn: null,
    temperature: null,
    humidity: null,
    wind_speed: null,
  };
}

function toNullableNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toNullableString(value) {
  return typeof value === "string" && value.trim() ? value : null;
}
