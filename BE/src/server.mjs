import http from "node:http";
import { handleRoute } from "./routes/index.mjs";
import { prewarmBootstrapAqiSnapshot } from "./services/bootstrap-aqi-cache.mjs";

const preferredPort = Number(process.env.PORT || 5001);

void prewarmBootstrapAqiSnapshot();

function createServer() {
  return http.createServer(async (req, res) => {
    if (!req.url) {
      res.writeHead(400, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ ok: false, error: "Missing request URL" }));
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    await handleRoute(req, res, url);
  });
}

function startServer(portToTry) {
  const server = createServer();

  server.once("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      const nextPort = portToTry + 1;
      console.warn(`Port ${portToTry} is busy, trying ${nextPort}...`);
      startServer(nextPort);
      return;
    }

    throw error;
  });

  server.listen(portToTry, () => {
    console.log(`AirPath BE listening on http://localhost:${portToTry}`);
  });
}

startServer(preferredPort);
