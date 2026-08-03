import http from "node:http";
import { getBootstrapData, getDatabaseHealth } from "./db.mjs";

const port = Number(process.env.PORT || 3001);

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendJson(res, 400, { ok: false, error: "Missing request URL" });
    return;
  }

  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      const health = await getDatabaseHealth();
      sendJson(res, 200, { ok: true, health });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/bootstrap") {
      const data = await getBootstrapData();
      sendJson(res, 200, { ok: true, ...data });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

server.listen(port, () => {
  console.log(`AirPath API listening on http://localhost:${port}`);
});
