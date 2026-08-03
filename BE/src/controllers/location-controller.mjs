import { sql } from "../db.mjs";
import { assert, isNonEmptyString, toNullableString } from "../utils/validation.mjs";

const allowedLocationTypes = new Set(["station", "district", "poi", "road_point", "indoor_place"]);

function normalizeLocationInput(body) {
  assert(isNonEmptyString(body.name), "Vui lòng nhập tên cơ sở.");
  assert(isNonEmptyString(body.locationType), "Vui lòng chọn loại cơ sở.");

  const locationType = body.locationType.trim();
  assert(allowedLocationTypes.has(locationType), "Loại cơ sở không hợp lệ. Vui lòng chọn trong danh sách.");

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  assert(Number.isFinite(lat) && lat >= -90 && lat <= 90, "Vĩ độ không hợp lệ.");
  assert(Number.isFinite(lng) && lng >= -180 && lng <= 180, "Kinh độ không hợp lệ.");

  return {
    name: body.name.trim(),
    locationType,
    city: toNullableString(body.city),
    district: toNullableString(body.district),
    address: toNullableString(body.address),
    lat,
    lng,
    metadata: {
      description: toNullableString(body.description),
      amenities: Array.isArray(body.amenities)
        ? body.amenities.filter(isNonEmptyString).map((item) => item.trim()).slice(0, 30)
        : [],
    },
  };
}

export async function listLocationsController(searchParams) {
  const city = toNullableString(searchParams.get("city"));
  const district = toNullableString(searchParams.get("district"));
  const type = toNullableString(searchParams.get("type"));

  const locations = await sql`
    select
      l.id,
      l.name,
      l.location_type,
      l.city,
      l.district,
      l.address,
      l.lat,
      l.lng,
      l.metadata,
      l.created_at,
      nearest_aqi.aqi as aqi_level,
      avg_reviews.avg_rating::numeric(2,1) as rating,
      coalesce(avg_reviews.total_reviews, 0)::integer as reviews
    from airpath.locations l
    left join lateral (
      select m.aqi
      from airpath.aqi_measurements m
      join airpath.locations ml on ml.id = m.location_id
      order by
        power(ml.lat - l.lat, 2) + power(ml.lng - l.lng, 2),
        m.measured_at desc
      limit 1
    ) nearest_aqi on true
    left join (
      select
        location_id,
        avg(rating) as avg_rating,
        count(*) as total_reviews
      from airpath.location_reviews
      where is_hidden = false
      group by location_id
    ) avg_reviews on avg_reviews.location_id = l.id
    where (${city}::text is null or city = ${city})
      and (${district}::text is null or district = ${district})
      and (${type}::text is null or location_type = ${type})
    order by l.created_at desc, city asc nulls last, district asc nulls last, name asc
    limit 100
  `;

  return { locations };
}

export async function createLocationController(body) {
  const input = normalizeLocationInput(body);

  const [location] = await sql`
    insert into airpath.locations (
      name,
      location_type,
      city,
      district,
      address,
      lat,
      lng,
      metadata
    ) values (
      ${input.name},
      ${input.locationType},
      ${input.city},
      ${input.district},
      ${input.address},
      ${input.lat},
      ${input.lng},
      ${JSON.stringify(input.metadata)}::jsonb
    )
    returning *
  `;

  return { location };
}

export async function updateLocationController(locationId, body) {
  const input = normalizeLocationInput(body);

  const [location] = await sql`
    update airpath.locations
    set
      name = ${input.name},
      location_type = ${input.locationType},
      city = ${input.city},
      district = ${input.district},
      address = ${input.address},
      lat = ${input.lat},
      lng = ${input.lng},
      metadata = ${JSON.stringify(input.metadata)}::jsonb
    where id = ${locationId}
    returning *
  `;

  if (!location) {
    throw new Error("Location not found.");
  }

  return { location };
}

export async function deleteLocationController(locationId) {
  const [location] = await sql`
    delete from airpath.locations
    where id = ${locationId}
    returning *
  `;

  if (!location) {
    throw new Error("Location not found.");
  }

  return { location };
}
