import { translateController } from "../controllers/translate-controller.mjs";
import { readJsonBody, sendJson } from "../utils/http.mjs";

export async function handleTranslateRoutes(req, res, pathname) {
  if (req.method === "POST" && pathname === "/api/translate") {
    const body = await readJsonBody(req);
    sendJson(res, 200, { ok: true, ...(await translateController(body)) });
    return true;
  }

  return false;
}
