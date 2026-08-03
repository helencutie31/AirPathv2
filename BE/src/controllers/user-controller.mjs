import { sql } from "../db.mjs";
import { hashPassword } from "../utils/security.mjs";
import { sanitizeArray, toBoolean, toNullableNumber, toNullableString } from "../utils/validation.mjs";

export async function getUserProfileController(userId) {
  const [userRows, profileRows, conditionRows, activityRows, preferenceRows] = await sql.transaction([
    sql`
      select id, email, full_name, birth_year, home_lat, home_lng, created_at, updated_at
      from airpath.users
      where id = ${userId}
    `,
    sql`
      select
        p.user_id,
        p.alert_threshold,
        p.default_max_route_ratio,
        p.primary_activity_id,
        p.mask_preference,
        p.phone,
        a.name as primary_activity_name
      from airpath.user_profiles p
      left join airpath.activities a on a.id = p.primary_activity_id
      where p.user_id = ${userId}
    `,
    sql`
      select
        hc.id,
        hc.slug,
        hc.name,
        hc.description,
        uc.severity,
        uc.noted_at
      from airpath.user_conditions uc
      join airpath.health_conditions hc on hc.id = uc.condition_id
      where uc.user_id = ${userId}
      order by hc.name asc
    `,
    sql`
      select
        a.id,
        a.slug,
        a.name,
        a.description,
        ua.frequency_per_week,
        ua.is_primary
      from airpath.user_activities ua
      join airpath.activities a on a.id = ua.activity_id
      where ua.user_id = ${userId}
      order by ua.is_primary desc, a.name asc
    `,
    sql`
      select *
      from airpath.notification_preferences
      where user_id = ${userId}
    `,
  ]);

  const user = userRows[0];
  if (!user) {
    throw new Error("User not found.");
  }

  return {
    user,
    profile: profileRows[0] ?? null,
    conditions: conditionRows,
    activities: activityRows,
    notificationPreferences: preferenceRows[0] ?? null,
  };
}

export async function updateUserProfileController(userId, body) {
  const fullName = toNullableString(body.fullName);
  const email = toNullableString(body.email);
  const password = toNullableString(body.password);
  const birthYear = toNullableNumber(body.birthYear);
  const homeLat = toNullableNumber(body.homeLat);
  const homeLng = toNullableNumber(body.homeLng);
  const alertThreshold = body.alertThreshold === undefined ? 140 : Number(body.alertThreshold);
  const defaultMaxRouteRatio =
    body.defaultMaxRouteRatio === undefined ? 1.5 : Number(body.defaultMaxRouteRatio);
  const primaryActivityId = toNullableString(body.primaryActivityId);
  const maskPreference = toNullableString(body.maskPreference);
  const phone = toNullableString(body.phone);
  const passwordHash = password ? await hashPassword(password) : null;

  await sql`
    update airpath.users
    set
      email = coalesce(${email}, email),
      full_name = coalesce(${fullName}, full_name),
      birth_year = coalesce(${birthYear}, birth_year),
      home_lat = ${homeLat},
      home_lng = ${homeLng},
      password_hash = coalesce(${passwordHash}, password_hash)
    where id = ${userId}
  `;

  await sql`
    insert into airpath.user_profiles (
      user_id,
      alert_threshold,
      default_max_route_ratio,
      primary_activity_id,
      mask_preference,
      phone
    ) values (
      ${userId},
      ${alertThreshold},
      ${defaultMaxRouteRatio},
      ${primaryActivityId},
      ${maskPreference},
      ${phone}
    )
    on conflict (user_id) do update
    set
      alert_threshold = excluded.alert_threshold,
      default_max_route_ratio = excluded.default_max_route_ratio,
      primary_activity_id = excluded.primary_activity_id,
      mask_preference = excluded.mask_preference,
      phone = excluded.phone
  `;

  const conditions = sanitizeArray(body.conditions);
  if (conditions.length > 0) {
    await sql`delete from airpath.user_conditions where user_id = ${userId}`;

    for (const condition of conditions) {
      await sql`
        insert into airpath.user_conditions (user_id, condition_id, severity)
        values (${userId}, ${condition.conditionId}, ${condition.severity ?? null})
      `;
    }
  }

  const activities = sanitizeArray(body.activities);
  if (activities.length > 0) {
    await sql`delete from airpath.user_activities where user_id = ${userId}`;

    for (const activity of activities) {
      await sql`
        insert into airpath.user_activities (
          user_id,
          activity_id,
          frequency_per_week,
          is_primary
        ) values (
          ${userId},
          ${activity.activityId},
          ${activity.frequencyPerWeek ?? null},
          ${toBoolean(activity.isPrimary)}
        )
      `;
    }
  }

  if (body.notificationPreferences) {
    const prefs = body.notificationPreferences;
    await sql`
      insert into airpath.notification_preferences (
        user_id,
        alert_enabled,
        tip_enabled,
        route_enabled,
        social_enabled,
        system_enabled,
        push_enabled,
        email_enabled,
        daily_tip_time,
        weekly_report_enabled
      ) values (
        ${userId},
        ${toBoolean(prefs.alertEnabled, true)},
        ${toBoolean(prefs.tipEnabled, true)},
        ${toBoolean(prefs.routeEnabled, true)},
        ${toBoolean(prefs.socialEnabled, false)},
        ${toBoolean(prefs.systemEnabled, true)},
        ${toBoolean(prefs.pushEnabled, true)},
        ${toBoolean(prefs.emailEnabled, false)},
        ${toNullableString(prefs.dailyTipTime)},
        ${toBoolean(prefs.weeklyReportEnabled, true)}
      )
      on conflict (user_id) do update
      set
        alert_enabled = excluded.alert_enabled,
        tip_enabled = excluded.tip_enabled,
        route_enabled = excluded.route_enabled,
        social_enabled = excluded.social_enabled,
        system_enabled = excluded.system_enabled,
        push_enabled = excluded.push_enabled,
        email_enabled = excluded.email_enabled,
        daily_tip_time = excluded.daily_tip_time,
        weekly_report_enabled = excluded.weekly_report_enabled
    `;
  }

  return getUserProfileController(userId);
}

export async function getUserDashboardController(userId) {
  const [profile, notifications, adviceEvents, routeRequests, nearestAqi] = await sql.transaction([
    sql`
      select
        u.id,
        u.full_name,
        u.home_lat,
        u.home_lng,
        p.alert_threshold,
        p.default_max_route_ratio,
        p.mask_preference
      from airpath.users u
      left join airpath.user_profiles p on p.user_id = u.id
      where u.id = ${userId}
    `,
    sql`
      select count(*)::int as unread_count
      from airpath.notifications
      where user_id = ${userId} and is_read = false
    `,
    sql`
      select id, severity, title, body, event_time, is_read
      from airpath.advice_events
      where user_id = ${userId}
      order by event_time desc
      limit 5
    `,
    sql`
      select id, origin_label, destination_label, status, requested_at, finished_at
      from airpath.route_requests
      where user_id = ${userId}
      order by requested_at desc
      limit 5
    `,
    sql`
      select
        l.id as location_id,
        l.name as location_name,
        m.aqi,
        m.measured_at
      from airpath.locations l
      join airpath.users u on u.id = ${userId}
      join lateral (
        select aqi, measured_at
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
  ]);

  if (!profile[0]) {
    throw new Error("User not found.");
  }

  return {
    summary: profile[0],
    unreadNotifications: notifications[0]?.unread_count ?? 0,
    recentAdviceEvents: adviceEvents,
    recentRouteRequests: routeRequests,
    nearestAqi: nearestAqi[0] ?? null,
  };
}

export async function getAdminDashboardController() {
  const [systemAqiRows, usersRows, locationsRows, moderationRows] = await sql.transaction([
    sql`
      select coalesce(round(avg(measured.aqi))::int, 42) as system_aqi
      from airpath.locations l
      join lateral (
        select aqi
        from airpath.aqi_measurements
        where location_id = l.id
        order by measured_at desc
        limit 1
      ) measured on true
    `,
    sql`
      select count(*)::int as active_users
      from airpath.users
      where updated_at >= now() - interval '7 days'
    `,
    sql`
      select count(*)::int as total_locations
      from airpath.locations
    `,
    sql`
      select count(*)::int as pending_moderation
      from airpath.location_reviews
      where is_hidden = true
    `,
  ]);

  return {
    overview: {
      systemAqi: systemAqiRows[0]?.system_aqi ?? 42,
      activeUsers: usersRows[0]?.active_users ?? 0,
      totalLocations: locationsRows[0]?.total_locations ?? 0,
      pendingModeration: moderationRows[0]?.pending_moderation ?? 0,
    },
  };
}

export async function listUserRouteRequestsController(userId) {
  const routeRequests = await sql`
    select
      rr.id,
      rr.origin_label,
      rr.destination_label,
      rr.max_ratio,
      rr.shortest_distance_m,
      rr.shortest_duration_s,
      rr.status,
      rr.requested_at,
      rr.finished_at,
      coalesce(
        json_agg(
          json_build_object(
            'id', ro.id,
            'optionRank', ro.option_rank,
            'routeName', ro.route_name,
            'distanceM', ro.distance_m,
            'durationS', ro.duration_s,
            'avgAqi', ro.avg_aqi,
            'exposureScore', ro.exposure_score,
            'exposure', ro.exposure,
            'isRecommended', ro.is_recommended,
            'isWithinRatio', ro.is_within_ratio,
            'aqiSavingPercent', ro.aqi_saving_percent,
            'polyline', ro.polyline
          )
          order by ro.option_rank asc
        ) filter (where ro.id is not null),
        '[]'::json
      ) as options
    from airpath.route_requests rr
    left join airpath.route_options ro on ro.request_id = rr.id
    where rr.user_id = ${userId}
    group by rr.id
    order by rr.requested_at desc
  `;

  return { routeRequests };
}

export async function listUserAdviceEventsController(userId) {
  const adviceEvents = await sql`
    select
      ae.id,
      ae.rule_id,
      ae.location_id,
      ae.aqi_measurement_id,
      ae.activity_id,
      ae.severity,
      ae.title,
      ae.body,
      ae.event_time,
      ae.is_read,
      ae.channel,
      ae.metadata,
      ae.created_at
    from airpath.advice_events ae
    where ae.user_id = ${userId}
    order by ae.event_time desc
    limit 50
  `;

  return { adviceEvents };
}

