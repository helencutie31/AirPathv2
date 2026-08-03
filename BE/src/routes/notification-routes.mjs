import {
  getNotificationPreferencesController,
  listNotificationsController,
  markNotificationReadController,
  updateNotificationPreferencesController,
  savePushSubscriptionController,
  dispatchAqiAlertController,
} from "../controllers/notification-controller.mjs";
import { methodNotAllowed, readJsonBody, sendJson } from "../utils/http.mjs";
import { parseUuidParam } from "../utils/validation.mjs";
import { getVapidPublicKey } from "../services/push-service.mjs";

export async function handleNotificationRoutes(req, res, pathname) {
  // GET /api/push/vapid-public-key — returns VAPID public key for FE subscription
  if (req.method === "GET" && pathname === "/api/push/vapid-public-key") {
    sendJson(res, 200, { ok: true, publicKey: getVapidPublicKey() });
    return true;
  }

  const userNotificationsMatch = pathname.match(/^\/api\/users\/([^/]+)\/notifications$/);
  if (userNotificationsMatch) {
    if (req.method !== "GET") {
      methodNotAllowed(res);
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      ...(await listNotificationsController(parseUuidParam(userNotificationsMatch[1], "userId"))),
    });
    return true;
  }

  const notificationPreferencesMatch = pathname.match(
    /^\/api\/users\/([^/]+)\/notification-preferences$/,
  );
  if (notificationPreferencesMatch) {
    const userId = parseUuidParam(notificationPreferencesMatch[1], "userId");

    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        ...(await getNotificationPreferencesController(userId)),
      });
      return true;
    }

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      sendJson(res, 200, {
        ok: true,
        ...(await updateNotificationPreferencesController(userId, body)),
      });
      return true;
    }

    methodNotAllowed(res);
    return true;
  }

  // POST /api/users/:id/push-subscription — register browser push subscription
  const pushSubscriptionMatch = pathname.match(/^\/api\/users\/([^/]+)\/push-subscription$/);
  if (pushSubscriptionMatch) {
    if (req.method !== "POST") {
      methodNotAllowed(res);
      return true;
    }
    const userId = parseUuidParam(pushSubscriptionMatch[1], "userId");
    const body = await readJsonBody(req);
    sendJson(res, 200, {
      ok: true,
      ...(await savePushSubscriptionController(userId, body.subscription)),
    });
    return true;
  }

  // POST /api/users/:id/aqi-alert — dispatch real push + email AQI alert
  const aqiAlertMatch = pathname.match(/^\/api\/users\/([^/]+)\/aqi-alert$/);
  if (aqiAlertMatch) {
    if (req.method !== "POST") {
      methodNotAllowed(res);
      return true;
    }
    const userId = parseUuidParam(aqiAlertMatch[1], "userId");
    const body = await readJsonBody(req);
    sendJson(res, 200, {
      ok: true,
      ...(await dispatchAqiAlertController(userId, body)),
    });
    return true;
  }

  const notificationReadMatch = pathname.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notificationReadMatch) {
    if (req.method !== "PATCH") {
      methodNotAllowed(res);
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      ...(await markNotificationReadController(
        parseUuidParam(notificationReadMatch[1], "notificationId"),
      )),
    });
    return true;
  }

  return false;
}
