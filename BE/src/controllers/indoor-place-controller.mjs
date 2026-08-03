import { sql } from "../db.mjs";
import { assert, isNonEmptyString, toBoolean, toNullableNumber, toNullableString } from "../utils/validation.mjs";

export async function listIndoorPlacesController(searchParams) {
  const city = toNullableString(searchParams.get("city"));
  const district = toNullableString(searchParams.get("district"));
  const placeType = toNullableString(searchParams.get("placeType"));

  const indoorPlaces = await sql`
    select
      ip.*,
      latest.aqi as latest_aqi,
      latest.measured_at as latest_measured_at
    from airpath.indoor_places ip
    left join lateral (
      select aqi, measured_at
      from airpath.indoor_place_aqi
      where place_id = ip.id
      order by measured_at desc
      limit 1
    ) latest on true
    where (${city}::text is null or ip.city = ${city})
      and (${district}::text is null or ip.district = ${district})
      and (${placeType}::text is null or ip.place_type = ${placeType})
    order by ip.city asc nulls last, ip.district asc nulls last, ip.name asc
  `;

  return { indoorPlaces };
}

export async function createIndoorPlaceController(body) {
  assert(isNonEmptyString(body.name), "name is required.");

  const [indoorPlace] = await sql`
    insert into airpath.indoor_places (
      name,
      city,
      district,
      address,
      lat,
      lng,
      aqi_controlled,
      has_hepa,
      place_type
    ) values (
      ${body.name.trim()},
      ${toNullableString(body.city)},
      ${toNullableString(body.district)},
      ${toNullableString(body.address)},
      ${toNullableNumber(body.lat)},
      ${toNullableNumber(body.lng)},
      ${toBoolean(body.aqiControlled, true)},
      ${toBoolean(body.hasHepa, false)},
      ${toNullableString(body.placeType)}
    )
    returning *
  `;

  return { indoorPlace };
}

export async function createIndoorPlaceMeasurementController(placeId, body) {
  const [measurement] = await sql`
    insert into airpath.indoor_place_aqi (
      place_id,
      measured_at,
      aqi,
      source
    ) values (
      ${placeId},
      ${toNullableString(body.measuredAt) ?? new Date().toISOString()},
      ${Number(body.aqi)},
      ${toNullableString(body.source)}
    )
    returning *
  `;

  return { measurement };
}

