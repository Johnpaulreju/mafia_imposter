import { createServer } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { getSession } from "../lib/game-store";
import { dispatchAction, getStateForSession } from "../lib/server-actions";
import { publicSnapshot } from "../lib/safe-state";
import { tickRoom } from "../lib/game-engine";

const server = createServer((_req, res) => {
  res.statusCode = 426;
  res.end("WebSocket endpoint");
});

const wss = new WebSocketServer({ server });
const clients = new Map<string, Set<WebSocket & { sessionId?: string; roomId?: string }>>();

function sendSnapshot(ws: WebSocket & { sessionId?: string }, state: Awaited<ReturnType<typeof getStateForSession>>) {
  if (state && ws.sessionId && ws.readyState === ws.OPEN) ws.send(JSON.stringify({ type: "snapshot", data: publicSnapshot(state, ws.sessionId) }));
}

async function broadcast(roomId: string, state: NonNullable<Awaited<ReturnType<typeof getStateForSession>>>) {
  const set = clients.get(roomId); if (!set) return;
  for (const ws of set) sendSnapshot(ws, state);
}

wss.on("connection", async (raw, req) => {
  const ws = raw as WebSocket & { sessionId?: string; roomId?: string };
  const url = new URL(req.url ?? "/", "http://localhost");
  const sessionId = url.searchParams.get("sessionId");
  const session = sessionId ? await getSession(sessionId) : null;
  if (!session) { ws.close(1008, "Invalid session"); return; }
  ws.sessionId = sessionId!; ws.roomId = session.roomId;
  if (!clients.has(session.roomId)) clients.set(session.roomId, new Set());
  clients.get(session.roomId)!.add(ws);
  const state = await getStateForSession(sessionId!);
  if (state) sendSnapshot(ws, state);

  ws.on("message", async (rawMessage) => {
    try {
      const msg = JSON.parse(rawMessage.toString());
      if (msg.type !== "action") return;
      const nextState = await dispatchAction(sessionId!, msg.action ?? {});
      await broadcast(session.roomId, nextState);
    } catch (error) {
      ws.send(JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Action failed" }));
    }
  });
  ws.on("close", () => clients.get(session.roomId)?.delete(ws));
});

setInterval(async () => {
  for (const roomId of clients.keys()) {
    const state = await tickRoom(roomId);
    if (state) await broadcast(roomId, state);
  }
}, 250);

export default server;
