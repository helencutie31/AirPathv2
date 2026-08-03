import { handleAdviceRoutes } from "./advice-routes.mjs";
import { handleAqiRoutes } from "./aqi-routes.mjs";
import { handleAuthRoutes } from "./auth-routes.mjs";

import { handleIndoorPlaceRoutes } from "./indoor-place-routes.mjs";
import { handleLocationRoutes } from "./location-routes.mjs";
import { handleMapsRoutes } from "./maps-routes.mjs";
import { handleNotificationRoutes } from "./notification-routes.mjs";
import { handleRouteRequestRoutes } from "./route-request-routes.mjs";
import { handleSystemRoutes } from "./system-routes.mjs";
import { handleAdminRoutes } from "./admin-routes.mjs";
import { handleUserRoutes } from "./user-routes.mjs";
import { handleTranslateRoutes } from "./translate-routes.mjs";
import { notFound, sendJson } from "../utils/http.mjs";

const routeHandlers = [
  handleSystemRoutes,
  handleAuthRoutes,
  handleUserRoutes,
  handleNotificationRoutes,
  handleLocationRoutes,
  handleAqiRoutes,
  handleMapsRoutes,
  handleIndoorPlaceRoutes,
  handleRouteRequestRoutes,
  handleAdviceRoutes,
  handleAdminRoutes,
  handleTranslateRoutes,
];

export async function handleRoute(req, res, url) {
  const { pathname, searchParams } = url;

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  try {
    for (const routeHandler of routeHandlers) {
      const handled = await routeHandler(req, res, pathname, searchParams, url);
      if (handled) {
        return;
      }
    }

    notFound(res);
  } catch (error) {
    const databaseErrorCode =
      error && typeof error === "object" && "code" in error ? String(error.code) : null;
    const message = databaseErrorCode?.startsWith("23")
      ? "Vui lòng kiểm tra thông tin và thử lại."
      : error instanceof Error
        ? error.message
        : "Unknown error";
    sendJson(res, 400, { ok: false, error: message });
  }
}
