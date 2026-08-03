import {
  createIndoorPlaceController,
  createIndoorPlaceMeasurementController,
  listIndoorPlacesController,
} from "../controllers/indoor-place-controller.mjs";
import { methodNotAllowed, readJsonBody, sendJson } from "../utils/http.mjs";
import { parseUuidParam } from "../utils/validation.mjs";

export async function handleIndoorPlaceRoutes(req, res, pathname, searchParams) {
  if (pathname === "/api/indoor-places") {
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, ...(await listIndoorPlacesController(searchParams)) });
      return true;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 201, { ok: true, ...(await createIndoorPlaceController(body)) });
      return true;
    }

    methodNotAllowed(res);
    return true;
  }

  const indoorPlaceMeasurementMatch = pathname.match(/^\/api\/indoor-places\/([^/]+)\/measurements$/);
  if (!indoorPlaceMeasurementMatch) {
    return false;
  }

  if (req.method !== "POST") {
    methodNotAllowed(res);
    return true;
  }

  const body = await readJsonBody(req);
  sendJson(res, 201, {
    ok: true,
    ...(await createIndoorPlaceMeasurementController(
      parseUuidParam(indoorPlaceMeasurementMatch[1], "placeId"),
      body,
    )),
  });
  return true;
}

