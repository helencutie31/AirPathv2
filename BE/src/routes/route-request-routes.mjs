import {
  createRouteRequestController,
  getRouteRequestController,
} from "../controllers/route-request-controller.mjs";
import { methodNotAllowed, readJsonBody, sendJson } from "../utils/http.mjs";
import { parseUuidParam } from "../utils/validation.mjs";

export async function handleRouteRequestRoutes(req, res, pathname) {
  if (req.method === "POST" && pathname === "/api/route-requests") {
    const body = await readJsonBody(req);
    sendJson(res, 201, { ok: true, ...(await createRouteRequestController(body)) });
    return true;
  }

  const routeRequestMatch = pathname.match(/^\/api\/route-requests\/([^/]+)$/);
  if (!routeRequestMatch) {
    return false;
  }

  if (req.method !== "GET") {
    methodNotAllowed(res);
    return true;
  }

  sendJson(res, 200, {
    ok: true,
    ...(await getRouteRequestController(parseUuidParam(routeRequestMatch[1], "requestId"))),
  });
  return true;
}

