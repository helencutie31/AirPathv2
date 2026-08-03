import { getBootstrapController, getHealthController } from "../controllers/bootstrap-controller.mjs";
import { sendJson } from "../utils/http.mjs";

export async function handleSystemRoutes(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/health") {
    sendJson(res, 200, { ok: true, ...(await getHealthController()) });
    return true;
  }

  if (req.method === "GET" && pathname === "/api/bootstrap") {
    sendJson(res, 200, { ok: true, ...(await getBootstrapController()) });
    return true;
  }

  return false;
}

