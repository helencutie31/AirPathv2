import {
  createLocationController,
  deleteLocationController,
  listLocationsController,
  updateLocationController,
} from "../controllers/location-controller.mjs";
import {
  createLocationReviewController,
  listLocationReviewsController,
} from "../controllers/location-review-controller.mjs";
import { methodNotAllowed, readJsonBody, sendJson } from "../utils/http.mjs";
import { parseUuidParam } from "../utils/validation.mjs";

export async function handleLocationRoutes(req, res, pathname, searchParams) {
  const locationReviewsMatch = pathname.match(/^\/api\/locations\/([^/]+)\/reviews$/);
  if (locationReviewsMatch) {
    const locationId = parseUuidParam(locationReviewsMatch[1], "locationId");

    if (req.method === "GET") {
      sendJson(res, 200, {
        ok: true,
        ...(await listLocationReviewsController(locationId)),
      });
      return true;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 201, {
        ok: true,
        ...(await createLocationReviewController(locationId, body)),
      });
      return true;
    }

    methodNotAllowed(res);
    return true;
  }

  const locationMatch = pathname.match(/^\/api\/locations\/([^/]+)$/);
  if (locationMatch) {
    const locationId = parseUuidParam(locationMatch[1], "locationId");

    if (req.method === "PUT") {
      const body = await readJsonBody(req);
      sendJson(res, 200, {
        ok: true,
        ...(await updateLocationController(locationId, body)),
      });
      return true;
    }

    if (req.method === "DELETE") {
      sendJson(res, 200, {
        ok: true,
        ...(await deleteLocationController(locationId)),
      });
      return true;
    }

    methodNotAllowed(res);
    return true;
  }

  if (pathname !== "/api/locations") {
    return false;
  }

  if (req.method === "GET") {
    sendJson(res, 200, { ok: true, ...(await listLocationsController(searchParams)) });
    return true;
  }

  if (req.method === "POST") {
    const body = await readJsonBody(req);
    sendJson(res, 201, { ok: true, ...(await createLocationController(body)) });
    return true;
  }

  methodNotAllowed(res);
  return true;
}

