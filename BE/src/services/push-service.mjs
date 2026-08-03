/**
 * push-service.mjs
 * Web Push Notifications via VAPID (web-push library).
 * Free — no Firebase/FCM needed. Works in modern browsers.
 *
 * Setup:
 *   1. Generate VAPID keys: npx web-push generate-vapid-keys
 *   2. Add to .env: VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT
 *   3. FE must register a service worker and call pushManager.subscribe()
 *      passing the VAPID_PUBLIC_KEY as applicationServerKey.
 */

import webPush from "web-push";

let vapidConfigured = false;

function ensureVapidConfig() {
  if (vapidConfigured) return true;

  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@airparth.local";

  if (!publicKey || !privateKey) {
    return false;
  }

  try {
    webPush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
    return true;
  } catch (error) {
    console.error("[Push] Failed to set VAPID details:", error.message);
    return false;
  }
}

/**
 * Send a Web Push notification to a single subscription object.
 * @param {object} subscription - The PushSubscription object from the browser
 * @param {string} title
 * @param {string} body
 * @param {object} [data] - Extra data payload (e.g. { url, aqi })
 * @returns {{ sent: boolean, error: string|null }}
 */
export async function sendPushNotification(subscription, title, body, data = {}) {
  if (!ensureVapidConfig()) {
    console.warn("[Push] VAPID keys not configured — push skipped.");
    return { sent: false, error: "vapid_not_configured" };
  }

  if (!subscription?.endpoint) {
    return { sent: false, error: "invalid_subscription" };
  }

  const payload = JSON.stringify({
    title: String(title),
    body: String(body),
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    data: {
      url: "/",
      ...data,
    },
  });

  try {
    await webPush.sendNotification(subscription, payload);
    return { sent: true, error: null };
  } catch (error) {
    // 410 Gone = subscription expired/unsubscribed
    if (error.statusCode === 410 || error.statusCode === 404) {
      console.warn("[Push] Subscription expired (410/404), should be removed.");
      return { sent: false, error: "subscription_expired" };
    }
    console.error("[Push] sendNotification error:", error.message);
    return { sent: false, error: error.message };
  }
}

/**
 * Get the VAPID public key (to send to the frontend for subscription).
 * Returns null if not configured.
 */
export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY?.trim() || null;
}
