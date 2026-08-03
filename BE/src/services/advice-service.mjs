import { sql } from "../db.mjs";

function fallbackAdvice({ aqi, userName, conditionNames, activityName, locationName }) {
  const intro = userName ? `for ${userName}` : "for this user";
  const place = locationName ? ` near ${locationName}` : "";
  const conditions = conditionNames.length > 0 ? ` with ${conditionNames.join(", ")}` : "";
  const activity = activityName ? ` while planning ${activityName}` : "";

  if (aqi >= 151) {
    return {
      severity: "critical",
      title: "Avoid outdoor exposure",
      body: `AQI ${aqi}${place} is unhealthy${conditions}. Reduce outdoor time${activity}, wear a tight mask, and prefer indoor spaces with filtered air ${intro}.`,
    };
  }

  if (aqi >= 101) {
    return {
      severity: "warn",
      title: "Reduce intensity outdoors",
      body: `AQI ${aqi}${place} is elevated${conditions}. Keep outdoor activity shorter${activity} and use a mask on busy roads ${intro}.`,
    };
  }

  return {
    severity: "info",
    title: "Conditions are acceptable",
    body: `AQI ${aqi}${place} is acceptable${conditions}. Normal activity is reasonable${activity}, but continue monitoring peak traffic periods ${intro}.`,
  };
}

export async function buildAdvicePreview({ userId, locationId, activityId }) {
  const [userRows, conditionRows, activityRows, aqiRows, ruleRows] = await sql.transaction([
    sql`
      select u.id, u.full_name, p.alert_threshold
      from airpath.users u
      left join airpath.user_profiles p on p.user_id = u.id
      where u.id = ${userId}
    `,
    sql`
      select hc.id, hc.name
      from airpath.user_conditions uc
      join airpath.health_conditions hc on hc.id = uc.condition_id
      where uc.user_id = ${userId}
      order by hc.name asc
    `,
    activityId
      ? sql`
          select id, name
          from airpath.activities
          where id = ${activityId}
        `
      : sql`
          select a.id, a.name
          from airpath.user_activities ua
          join airpath.activities a on a.id = ua.activity_id
          where ua.user_id = ${userId} and ua.is_primary = true
          limit 1
        `,
    locationId
      ? sql`
          select
            l.id,
            l.name,
            m.id as measurement_id,
            m.aqi,
            m.measured_at
          from airpath.locations l
          left join lateral (
            select id, aqi, measured_at
            from airpath.aqi_measurements
            where location_id = l.id
            order by measured_at desc
            limit 1
          ) m on true
          where l.id = ${locationId}
        `
      : sql`
          select
            l.id,
            l.name,
            m.id as measurement_id,
            m.aqi,
            m.measured_at
          from airpath.locations l
          join airpath.users u on u.id = ${userId}
          left join lateral (
            select id, aqi, measured_at
            from airpath.aqi_measurements
            where location_id = l.id
            order by measured_at desc
            limit 1
          ) m on true
          where u.home_lat is not null
            and u.home_lng is not null
          order by power(l.lat - u.home_lat, 2) + power(l.lng - u.home_lng, 2)
          limit 1
        `,
    sql`
      select
        ar.id,
        ar.title,
        ar.body,
        ar.severity,
        ar.priority,
        hc.id as condition_id,
        a.id as activity_id
      from airpath.advice_rules ar
      left join airpath.health_conditions hc on hc.id = ar.condition_id
      left join airpath.activities a on a.id = ar.activity_id
      where ar.is_active = true
      order by ar.priority asc, ar.created_at asc
    `,
  ]);

  const user = userRows[0];
  if (!user) {
    throw new Error("User not found.");
  }

  const latestAqi = aqiRows[0]?.aqi ?? null;
  const conditionIds = new Set(conditionRows.map((row) => row.id));
  const selectedActivityId = activityRows[0]?.id ?? null;

  const matchedRule = ruleRows.find((rule) => {
    const matchesAqi = latestAqi >= rule.aqi_min && latestAqi <= rule.aqi_max;
    const matchesCondition = !rule.condition_id || conditionIds.has(rule.condition_id);
    const matchesActivity = !rule.activity_id || rule.activity_id === selectedActivityId;
    return matchesAqi && matchesCondition && matchesActivity;
  });

  const advice = latestAqi !== null
    ? matchedRule
      ? {
          severity: matchedRule.severity,
          title: matchedRule.title,
          body: matchedRule.body,
        }
      : fallbackAdvice({
          aqi: latestAqi,
          userName: user.full_name,
          conditionNames: conditionRows.map((row) => row.name),
          activityName: activityRows[0]?.name ?? null,
          locationName: aqiRows[0]?.name ?? null,
        })
    : {
        severity: "info",
        title: "Hiện chưa có dữ liệu AQI",
        body: `Không tìm thấy chỉ số chất lượng không khí tại vị trí hiện tại. Hãy cập nhật vị trí hoặc chọn điểm có dữ liệu để nhận gợi ý chính xác hơn.`,
      };

  return {
    user,
    location: aqiRows[0] ?? null,
    activity: activityRows[0] ?? null,
    conditions: conditionRows,
    advice,
  };
}
