import { listHiddenLocationReviewsController, updateLocationReviewController, deleteLocationReviewController } from "../controllers/location-review-controller.mjs";
import { methodNotAllowed, readJsonBody, sendJson } from "../utils/http.mjs";

export async function handleAdminRoutes(req, res, pathname) {
  if (req.method === "GET" && pathname === "/api/admin/reviews") {
    sendJson(res, 200, { ok: true, ...(await listHiddenLocationReviewsController()) });
    return true;
  }

  const reviewPatchMatch = pathname.match(/^\/api\/reviews\/([^/]+)$/);
  if (reviewPatchMatch) {
    const reviewId = reviewPatchMatch[1];
    if (req.method === "PATCH") {
      const body = await readJsonBody(req);
      sendJson(res, 200, { ok: true, ...(await updateLocationReviewController(reviewId, body)) });
      return true;
    }
    if (req.method === "DELETE") {
      sendJson(res, 200, { ok: true, ...(await deleteLocationReviewController(reviewId)) });
      return true;
    }
    methodNotAllowed(res);
    return true;
  }

  return false;
}
