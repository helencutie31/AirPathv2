import { sql } from "../db.mjs";
import { buildAdvicePreview } from "../services/advice-service.mjs";
import { assert, isNonEmptyString, toBoolean, toNullableNumber, toNullableString } from "../utils/validation.mjs";

export async function listAdviceRulesController(searchParams) {
  const conditionId = toNullableString(searchParams.get("conditionId"));
  const activityId = toNullableString(searchParams.get("activityId"));
  const activeOnly = searchParams.get("activeOnly") === "true";

  const adviceRules = await sql`
    select
      ar.*,
      hc.name as condition_name,
      a.name as activity_name
    from airpath.advice_rules ar
    left join airpath.health_conditions hc on hc.id = ar.condition_id
    left join airpath.activities a on a.id = ar.activity_id
    where (${conditionId}::uuid is null or ar.condition_id = ${conditionId})
      and (${activityId}::uuid is null or ar.activity_id = ${activityId})
      and (${activeOnly} = false or ar.is_active = true)
    order by ar.priority asc, ar.created_at asc
  `;

  return { adviceRules };
}

export async function createAdviceRuleController(body) {
  assert(isNonEmptyString(body.name), "name is required.");
  assert(isNonEmptyString(body.title), "title is required.");
  assert(isNonEmptyString(body.body), "body is required.");

  const [adviceRule] = await sql`
    insert into airpath.advice_rules (
      name,
      condition_id,
      activity_id,
      aqi_min,
      aqi_max,
      severity,
      title,
      body,
      is_active,
      priority
    ) values (
      ${body.name.trim()},
      ${toNullableString(body.conditionId)},
      ${toNullableString(body.activityId)},
      ${Number(body.aqiMin ?? 0)},
      ${Number(body.aqiMax ?? 500)},
      ${body.severity ?? "info"},
      ${body.title.trim()},
      ${body.body.trim()},
      ${toBoolean(body.isActive, true)},
      ${Number(body.priority ?? 100)}
    )
    returning *
  `;

  return { adviceRule };
}

export async function previewAdviceController(body) {
  return buildAdvicePreview({
    userId: body.userId,
    locationId: toNullableString(body.locationId),
    activityId: toNullableString(body.activityId),
  });
}

export async function createAdviceEventController(body) {
  assert(isNonEmptyString(body.userId), "userId is required.");
  assert(isNonEmptyString(body.title), "title is required.");
  assert(isNonEmptyString(body.body), "body is required.");
  assert(isNonEmptyString(body.severity), "severity is required.");

  const metadata = JSON.stringify(body.metadata ?? {});
  const [adviceEvent] = await sql(
    `
      insert into airpath.advice_events (
        user_id,
        rule_id,
        location_id,
        aqi_measurement_id,
        activity_id,
        severity,
        title,
        body,
        event_time,
        is_read,
        channel,
        metadata
      ) values (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12::jsonb
      )
      returning *
    `,
    [
      body.userId,
      toNullableString(body.ruleId),
      toNullableString(body.locationId),
      toNullableNumber(body.aqiMeasurementId),
      toNullableString(body.activityId),
      body.severity,
      body.title.trim(),
      body.body.trim(),
      toNullableString(body.eventTime) ?? new Date().toISOString(),
      toBoolean(body.isRead, false),
      toNullableString(body.channel) ?? "in_app",
      metadata,
    ],
  );

  await sql`
    insert into airpath.notifications (
      user_id,
      type,
      title,
      description,
      related_advice_event_id
    ) values (
      ${body.userId},
      'tip',
      ${body.title.trim()},
      ${body.body.trim()},
      ${adviceEvent.id}
    )
  `;

  return { adviceEvent };
}

