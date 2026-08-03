import { sql } from "../db.mjs";
import { assert, isNonEmptyString, parseUuidParam, toNullableNumber, toNullableString } from "../utils/validation.mjs";
import { fetchIqAirMeasurement, fetchAqicnMeasurementDirect } from "../services/iqair-service.mjs";

function parseCoordinate(rawValue, fieldName, min, max) {
  const value = Number(rawValue);
  assert(Number.isFinite(value), `${fieldName} must be a valid number.`);
  assert(value >= min && value <= max, `${fieldName} must be between ${min} and ${max}.`);
  return value;
}

export async function getLatestAqiController(searchParams) {
  const locationId = searchParams.get("locationId");
  assert(isNonEmptyString(locationId), "locationId is required.");

  const measurement = (
    await sql`
      select
        l.id as location_id,
        l.name as location_name,
        m.id,
        m.measured_at,
        m.aqi,
        m.pm25,
        m.pm10,
        m.no2,
        m.o3,
        m.co,
        m.so2,
        m.source
      from airpath.locations l
      join airpath.aqi_measurements m on m.location_id = l.id
      where l.id = ${locationId}
      order by m.measured_at desc
      limit 1
    `
  )[0] ?? null;

  return { measurement };
}

export async function createMeasurementController(body) {
  const [measurement] = await sql`
    insert into airpath.aqi_measurements (
      location_id,
      measured_at,
      aqi,
      pm25,
      pm10,
      no2,
      o3,
      co,
      so2,
      source
    ) values (
      ${parseUuidParam(body.locationId, "locationId")},
      ${toNullableString(body.measuredAt) ?? new Date().toISOString()},
      ${Number(body.aqi)},
      ${toNullableNumber(body.pm25)},
      ${toNullableNumber(body.pm10)},
      ${toNullableNumber(body.no2)},
      ${toNullableNumber(body.o3)},
      ${toNullableNumber(body.co)},
      ${toNullableNumber(body.so2)},
      ${toNullableString(body.source)}
    )
    returning *
  `;

  return { measurement };
}

export async function getIqAirAqiController(searchParams) {
  const lat = parseCoordinate(searchParams.get("lat"), "lat", -90, 90);
  const lngRaw = searchParams.get("lng") ?? searchParams.get("lon");
  const lng = parseCoordinate(lngRaw, "lng", -180, 180);
  const measurement = await fetchIqAirMeasurement(lat, lng);

  return {
    measurement,
  };
}

export async function getAqicnAqiController(searchParams) {
  const lat = parseCoordinate(searchParams.get("lat"), "lat", -90, 90);
  const lngRaw = searchParams.get("lng") ?? searchParams.get("lon");
  const lng = parseCoordinate(lngRaw, "lng", -180, 180);
  const measurement = await fetchAqicnMeasurementDirect(lat, lng);

  if (!measurement) {
    throw new Error("AQICN data not available for this location.");
  }

  return { measurement };
}
