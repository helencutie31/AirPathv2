import {
  createAdviceEventController,
  createAdviceRuleController,
  listAdviceRulesController,
  previewAdviceController,
} from "../controllers/advice-controller.mjs";
import { methodNotAllowed, readJsonBody, sendJson } from "../utils/http.mjs";
import { parseUuidParam, toNullableString } from "../utils/validation.mjs";

export async function handleAdviceRoutes(req, res, pathname, searchParams) {
  if (pathname === "/api/advice-rules") {
    if (req.method === "GET") {
      sendJson(res, 200, { ok: true, ...(await listAdviceRulesController(searchParams)) });
      return true;
    }

    if (req.method === "POST") {
      const body = await readJsonBody(req);
      sendJson(res, 201, { ok: true, ...(await createAdviceRuleController(body)) });
      return true;
    }

    methodNotAllowed(res);
    return true;
  }

  if (req.method === "POST" && pathname === "/api/advice/preview") {
    const body = await readJsonBody(req);
    sendJson(res, 200, {
      ok: true,
      ...(await previewAdviceController({
        userId: parseUuidParam(body.userId, "userId"),
        locationId: toNullableString(body.locationId),
        activityId: toNullableString(body.activityId),
      })),
    });
    return true;
  }

  if (req.method === "POST" && pathname === "/api/advice-events") {
    const body = await readJsonBody(req);
    sendJson(res, 201, { ok: true, ...(await createAdviceEventController(body)) });
    return true;
  }

  return false;
}

