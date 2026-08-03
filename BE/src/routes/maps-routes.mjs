import { planRoutesController, reverseGeocodeController, searchPlacesController } from "../controllers/maps-controller.mjs";
import { readJsonBody, sendJson } from "../utils/http.mjs";

export async function handleMapsRoutes(req, res, pathname, searchParams) {
  if (req.method === "GET" && pathname === "/api/maps/search") {
    sendJson(res, 200, { ok: true, ...(await searchPlacesController(searchParams)) });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/maps/reverse") {
    sendJson(res, 200, { ok: true, ...(await reverseGeocodeController(searchParams)) });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/maps/plan-routes") {
    const body = await readJsonBody(req);
    sendJson(res, 200, { ok: true, ...(await planRoutesController(body)) });
    return true;
  }

  return false;
}
