import {
  createMeasurementController,
  getIqAirAqiController,
  getLatestAqiController,
  getAqicnAqiController,
} from "../controllers/aqi-controller.mjs";
import { readJsonBody, sendJson } from "../utils/http.mjs";

export async function handleAqiRoutes(req, res, pathname, searchParams) {
  if (req.method === "GET" && pathname === "/api/aqi/iqair") {
    sendJson(res, 200, { ok: true, ...(await getIqAirAqiController(searchParams)) });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/aqi/latest") {
    sendJson(res, 200, { ok: true, ...(await getLatestAqiController(searchParams)) });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/aqi/aqicn") {
    sendJson(res, 200, { ok: true, ...(await getAqicnAqiController(searchParams)) });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/aqi/measurements") {
    const body = await readJsonBody(req);
    sendJson(res, 201, { ok: true, ...(await createMeasurementController(body)) });
    return true;
  }

  return false;
}

