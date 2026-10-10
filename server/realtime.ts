import { createServer } from "node:http";
import { GameRealtimeService } from "./app";

if (process.env.NODE_ENV === "production" && !process.env.ALLOWED_ORIGINS?.trim()) {
  throw new Error("ALLOWED_ORIGINS must be set in production");
}

const port = Number(process.env.PORT || 3001);
const game = new GameRealtimeService();

const server = createServer(async (req, res) => {
  try {
    if (await game.handleHttp(req, res)) return;
    res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Not found" }));
  } catch (error) {
    console.error("[HTTP]", error);
    if (!res.headersSent) res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

game.attach(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Mafia realtime server listening on 0.0.0.0:${port}`);
});

let shuttingDown = false;
async function shutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`[Shutdown] ${signal}`);
  await game.shutdown();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));
