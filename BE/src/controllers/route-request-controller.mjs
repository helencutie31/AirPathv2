import { sql } from "../db.mjs";
import { assert, isNonEmptyString, sanitizeArray, toBoolean, toNullableNumber, toNullableString } from "../utils/validation.mjs";

function deriveExposure(avgAqi) {
  if (avgAqi >= 151) {
    return "high";
  }

  if (avgAqi >= 101) {
    return "medium";
  }

  return "low";
}

export async function createRouteRequestController(body) {
  assert(isNonEmptyString(body.userId), "userId is required.");
  assert(isNonEmptyString(body.originLabel), "originLabel is required.");
  assert(isNonEmptyString(body.destinationLabel), "destinationLabel is required.");

  const maxRatio = body.maxRatio === undefined ? 1.5 : Number(body.maxRatio);
  const options = sanitizeArray(body.options);

  const [request] = await sql`
    insert into airpath.route_requests (
      user_id,
      origin_label,
      origin_lat,
      origin_lng,
      destination_label,
      destination_lat,
      destination_lng,
      max_ratio,
      shortest_distance_m,
      shortest_duration_s,
      status,
      finished_at
    ) values (
      ${body.userId},
      ${body.originLabel},
      ${Number(body.originLat)},
      ${Number(body.originLng)},
      ${body.destinationLabel},
      ${Number(body.destinationLat)},
      ${Number(body.destinationLng)},
      ${maxRatio},
      ${Number(body.shortestDistanceM)},
      ${Number(body.shortestDurationS)},
      ${options.length > 0 ? "completed" : "pending"},
      ${options.length > 0 ? new Date().toISOString() : null}
    )
    returning *
  `;

  for (let index = 0; index < options.length; index += 1) {
    const option = options[index];
    const avgAqi = Number(option.avgAqi);
    const distanceM = Number(option.distanceM);
    const shortestDistance = Number(body.shortestDistanceM);

    await sql`
      insert into airpath.route_options (
        request_id,
        option_rank,
        route_name,
        distance_m,
        duration_s,
        avg_aqi,
        exposure_score,
        exposure,
        is_recommended,
        is_within_ratio,
        aqi_saving_percent,
        polyline
      ) values (
        ${request.id},
        ${index + 1},
        ${toNullableString(option.routeName)},
        ${distanceM},
        ${Number(option.durationS)},
        ${avgAqi},
        ${Number(option.exposureScore ?? avgAqi * distanceM)},
        ${option.exposure ?? deriveExposure(avgAqi)},
        ${toBoolean(option.isRecommended, index === 0)},
        ${distanceM <= shortestDistance * maxRatio},
        ${toNullableNumber(option.aqiSavingPercent)},
        ${option.polyline}
      )
    `;
  }

  if (options.length > 0) {
    const recommended = options.find((option) => option.isRecommended) ?? options[0];
    await sql`
      insert into airpath.notifications (
        user_id,
        type,
        title,
        description,
        related_route_request_id
      ) values (
        ${body.userId},
        'route',
        'New low-pollution route is ready',
        ${`Recommended route: ${recommended.routeName ?? body.destinationLabel}`},
        ${request.id}
      )
    `;
  }

  return getRouteRequestController(request.id);
}

export async function getRouteRequestController(requestId) {
  const [requestRows, optionRows] = await sql.transaction([
    sql`
      select *
      from airpath.route_requests
      where id = ${requestId}
    `,
    sql`
      select *
      from airpath.route_options
      where request_id = ${requestId}
      order by option_rank asc
    `,
  ]);

  if (!requestRows[0]) {
    throw new Error("Route request not found.");
  }

  return {
    request: requestRows[0],
    options: optionRows,
  };
}

