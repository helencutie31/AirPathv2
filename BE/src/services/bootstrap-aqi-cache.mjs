import { fetchIqAirMeasurement } from "./iqair-service.mjs";

const BOOTSTRAP_AQI_COORDS = {
  lat: 21.0041,
  lng: 105.8428,
};

const BOOTSTRAP_AQI_TTL_MS = 10 * 60 * 1000;

let cachedBootstrapAqi = null;
let cachedBootstrapAqiExpiresAt = 0;
let bootstrapAqiPromise = null;

async function loadBootstrapAqiSnapshot() {
  const measurement = await fetchIqAirMeasurement(BOOTSTRAP_AQI_COORDS.lat, BOOTSTRAP_AQI_COORDS.lng);

  if (!measurement) {
    return null;
  }

  cachedBootstrapAqi = measurement;
  cachedBootstrapAqiExpiresAt = Date.now() + BOOTSTRAP_AQI_TTL_MS;
  return measurement;
}

export function prewarmBootstrapAqiSnapshot() {
  if (bootstrapAqiPromise) {
    return bootstrapAqiPromise;
  }

  bootstrapAqiPromise = loadBootstrapAqiSnapshot()
    .catch((error) => {
      console.warn("[Bootstrap AQI] Failed to prewarm snapshot:", error?.message ?? error);
      return cachedBootstrapAqi;
    })
    .finally(() => {
      bootstrapAqiPromise = null;
    });

  return bootstrapAqiPromise;
}

export async function getBootstrapAqiSnapshot() {
  if (cachedBootstrapAqi && cachedBootstrapAqiExpiresAt > Date.now()) {
    return cachedBootstrapAqi;
  }

  if (bootstrapAqiPromise) {
    return bootstrapAqiPromise;
  }

  return prewarmBootstrapAqiSnapshot();
}
