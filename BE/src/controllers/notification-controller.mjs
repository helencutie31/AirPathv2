import { sql } from "../db.mjs";
import { toBoolean, toNullableString } from "../utils/validation.mjs";
import { sendPushNotification } from "../services/push-service.mjs";
import { sendEmail, buildAqiAlertEmailHtml } from "../services/email-service.mjs";

export async function listNotificationsController(userId) {
  const notifications = await sql`
    select
      id,
      type,
      title,
      description,
      is_read,
      is_pinned,
      related_route_request_id,
      related_advice_event_id,
      created_at,
      read_at
    from airpath.notifications
    where user_id = ${userId}
    order by is_pinned desc, created_at desc
    limit 50
  `;

  return { notifications };
}

export async function markNotificationReadController(notificationId) {
  const [notification] = await sql`
    update airpath.notifications
    set
      is_read = true,
      read_at = now()
    where id = ${notificationId}
    returning *
  `;

  if (!notification) {
    throw new Error("Notification not found.");
  }

  return { notification };
}

export async function getNotificationPreferencesController(userId) {
  const rows = await sql`
    select *
    from airpath.notification_preferences
    where user_id = ${userId}
  `;

  if (!rows[0]) {
    throw new Error("Notification preferences not found.");
  }

  return { notificationPreferences: rows[0] };
}

export async function updateNotificationPreferencesController(userId, prefs) {
  const [notificationPreferences] = await sql`
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
    returning *
  `;

  return { notificationPreferences };
}

/**
 * Save (upsert) a Web Push subscription for a user.
 * Stored in notification_preferences.push_subscription_json column (JSONB).
 * Gracefully handles missing column.
 */
export async function savePushSubscriptionController(userId, subscription) {
  if (!subscription?.endpoint) {
    throw new Error("Invalid push subscription.");
  }

  try {
    await sql`
      insert into airpath.notification_preferences (user_id, push_enabled, push_subscription_json)
      values (${userId}, true, ${JSON.stringify(subscription)}::jsonb)
      on conflict (user_id) do update
      set
        push_enabled = true,
        push_subscription_json = ${JSON.stringify(subscription)}::jsonb
    `;
    return { saved: true };
  } catch (error) {
    // Column may not exist yet — degrade gracefully
    console.warn("[Push] push_subscription_json column may not exist:", error.message);
    try {
      await sql`
        insert into airpath.notification_preferences (user_id, push_enabled)
        values (${userId}, true)
        on conflict (user_id) do update
        set push_enabled = true
      `;
    } catch (innerError) {
      console.error("[Push] Failed to save subscription:", innerError.message);
    }
    return { saved: false, error: "column_missing" };
  }
}

async function getUserAlertInfo(userId) {
  const rows = await sql`
    select
      u.email,
      u.full_name,
      np.push_enabled,
      np.email_enabled,
      np.alert_enabled
    from airpath.users u
    left join airpath.notification_preferences np on np.user_id = u.id
    where u.id = ${userId}
  `;
  return rows[0] ?? null;
}

async function getUserPushSubscription(userId) {
  try {
    const rows = await sql`
      select push_subscription_json
      from airpath.notification_preferences
      where user_id = ${userId}
        and push_subscription_json is not null
    `;
    return rows[0]?.push_subscription_json ?? null;
  } catch {
    return null;
  }
}

/**
 * Dispatch a real AQI alert:
 * 1. Saves in-app notification to DB
 * 2. Sends Web Push notification (if subscription exists + VAPID configured)
 * 3. Sends email (if email_enabled + SMTP configured)
 * All steps fail gracefully — no throw on push/email errors.
 *
 * @param {string} userId
 * @param {{ title: string, body: string, aqi?: number|null, aqiLabel?: string, location?: string }} alert
 */
export async function dispatchAqiAlertController(userId, alert) {
  const { title, body, aqi = null, aqiLabel = "", location = "" } = alert;

  // 1. Save in-app notification to DB (always, non-fatal)
  try {
    await sql`
      insert into airpath.notifications (user_id, type, title, description)
      values (${userId}, 'alert', ${title}, ${body})
    `;
  } catch (error) {
    console.error("[Dispatch] Failed to save DB notification:", error.message);
  }

  // 2. Check user preferences
  const userInfo = await getUserAlertInfo(userId);
  if (!userInfo || userInfo.alert_enabled === false) {
    return { dbSaved: true, pushSent: false, emailSent: false };
  }

  // 3. Dispatch push + email in parallel
  const [pushResult, emailResult] = await Promise.allSettled([
    (async () => {
      if (userInfo.push_enabled === false) return { sent: false, error: "push_disabled" };
      const subscription = await getUserPushSubscription(userId);
      if (!subscription) return { sent: false, error: "no_subscription" };
      return sendPushNotification(subscription, title, body, { aqi, location });
    })(),
    (async () => {
      if (userInfo.email_enabled !== true) return { sent: false, error: "email_disabled" };
      if (!userInfo.email) return { sent: false, error: "no_email" };
      const html = buildAqiAlertEmailHtml({
        title,
        body,
        aqi,
        aqiLabel,
        location,
        userName: userInfo.full_name || userInfo.email.split("@")[0],
      });
      return sendEmail(userInfo.email, title, html);
    })(),
  ]);

  return {
    dbSaved: true,
    pushSent: pushResult.status === "fulfilled" && pushResult.value?.sent === true,
    emailSent: emailResult.status === "fulfilled" && emailResult.value?.sent === true,
  };
}
