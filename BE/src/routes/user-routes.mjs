import {
  getAdminDashboardController,
  getUserDashboardController,
  getUserProfileController,
  listUserAdviceEventsController,
  listUserRouteRequestsController,
  updateUserProfileController,
} from "../controllers/user-controller.mjs";
import { methodNotAllowed, readJsonBody, sendJson } from "../utils/http.mjs";
import { parseUuidParam } from "../utils/validation.mjs";

export async function handleUserRoutes(req, res, pathname) {
  const adminDashboardMatch = pathname.match(/^\/api\/admin\/dashboard$/);
  if (adminDashboardMatch) {
    if (req.method !== "GET") {
      methodNotAllowed(res);
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      ...(await getAdminDashboardController()),
    });
    return true;
  }

  const userProfileMatch = pathname.match(/^\/api\/users\/([^/]+)\/profile$/);
  if (userProfileMatch) {
    const userId = parseUuidParam(userProfileMatch[1], "userId");
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, ...(await getUserProfileController(userId)) });
      return true;
    }
    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      sendJson(res, 200, { ok: true, ...(await updateUserProfileController(userId, body)) });
      return true;
    }
    methodNotAllowed(res);
    return true;
  }

  const dashboardMatch = pathname.match(/^\/api\/users\/([^/]+)\/dashboard$/);
  if (dashboardMatch) {
    if (req.method !== "GET") {
      methodNotAllowed(res);
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      ...(await getUserDashboardController(parseUuidParam(dashboardMatch[1], "userId"))),
    });
    return true;
  }

  const routeHistoryMatch = pathname.match(/^\/api\/users\/([^/]+)\/route-requests$/);
  if (routeHistoryMatch) {
    if (req.method !== "GET") {
      methodNotAllowed(res);
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      ...(await listUserRouteRequestsController(parseUuidParam(routeHistoryMatch[1], "userId"))),
    });
    return true;
  }

  const adviceEventsMatch = pathname.match(/^\/api\/users\/([^/]+)\/advice-events$/);
  if (adviceEventsMatch) {
    if (req.method !== "GET") {
      methodNotAllowed(res);
      return true;
    }

    sendJson(res, 200, {
      ok: true,
      ...(await listUserAdviceEventsController(parseUuidParam(adviceEventsMatch[1], "userId"))),
    });
    return true;
  }

  return false;
}

