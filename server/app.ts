import type { IncomingMessage, Server as HttpServer, ServerResponse } from "node:http";
import type { Duplex } from "node:stream";
import WebSocket, { WebSocketServer } from "ws";
import { handlePlayerDisconnect, tickRoom } from "../lib/game-engine";
import { getGame, getSession, saveGame } from "../lib/game-store";
import { getRedis } from "../lib/redis";
import { withRoomLock } from "../lib/room-lock";
import { publicSnapshot } from "../lib/safe-state";
import {
  createRoom,
  dispatchAction,
  getStateForSession,
  joinRoom,
  updateConfig,
} from "../lib/server-actions";
import type { GameState, MatchConfig } from "../lib/types";

type ClientSocket = WebSocket & {
  isAlive?: boolean;
  roomId?: string;
  sessionId?: string;
};

type RateBucket = { count: number; resetAt: number };

const MAX_BODY_BYTES = 16 * 1024;
const MAX_SOCKET_MESSAGE_BYTES = 16 * 1024;
const AUTH_TIMEOUT_MS = 10_000;
const DISCONNECT_GRACE_MS = 5_000;

const allowedActions = new Set([
  "START_MATCH",
  "KICK_PLAYER",
  "UPDATE_CONFIG",
  "SELECT_TARGET",
  "COMPLETE_TASK",
  "CAST_VOTE",
]);

function configuredOrigins() {
  const configured = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (process.env.NODE_ENV !== "production") {
    configured.push("http://localhost:3000", "http://127.0.0.1:3000");
  }

  return new Set(configured);
}

function originAllowed(origin: string | undefined, allowedOrigins: Set<string>) {
  if (!origin) return process.env.NODE_ENV !== "production";
  return allowedOrigins.has(origin);
}

function requestIp(req: IncomingMessage) {
  const forwarded = req.headers["x-forwarded-for"];
  const value = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  return value?.split(",")[0]?.trim() || req.socket.remoteAddress || "unknown";
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function cleanText(value: unknown, field: string, maxLength: number) {
  if (typeof value !== "string") throw new Error(`${field} is required`);
  const clean = value.trim();
  if (!clean || clean.length > maxLength) throw new Error(`${field} is invalid`);
  return clean;
}

async function readJson(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let size = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error("Request body is too large");
    chunks.push(buffer);
  }

  const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  if (!isPlainRecord(parsed)) throw new Error("Request body must be an object");
  return parsed;
}

export class GameRealtimeService {
  private readonly allowedOrigins = configuredOrigins();
  private readonly wss = new WebSocketServer({ noServer: true, maxPayload: MAX_SOCKET_MESSAGE_BYTES });
  private readonly clients = new Map<string, Set<ClientSocket>>();
  private readonly rateBuckets = new Map<string, RateBucket>();
  private readonly disconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private tickTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.wss.on("connection", (raw, req) => {
      void this.handleConnection(raw as ClientSocket, req);
    });
  }

  private takeRateLimit(key: string, limit: number, windowMs: number) {
    const now = Date.now();
    const current = this.rateBuckets.get(key);
    if (!current || current.resetAt <= now) {
      this.rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }
    if (current.count >= limit) return false;
    current.count += 1;
    return true;
  }

  private corsHeaders(origin: string | undefined) {
    const headers: Record<string, string> = { Vary: "Origin" };
    if (origin && this.allowedOrigins.has(origin)) {
      headers["Access-Control-Allow-Origin"] = origin;
      headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS";
      headers["Access-Control-Allow-Headers"] = "Content-Type";
      headers["Access-Control-Max-Age"] = "600";
    }
    return headers;
  }

  private sendJson(
    res: ServerResponse,
    status: number,
    body: unknown,
    origin?: string,
  ) {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...this.corsHeaders(origin),
    });
    res.end(JSON.stringify(body));
  }

  async handleHttp(req: IncomingMessage, res: ServerResponse) {
    const requestUrl = new URL(req.url ?? "/", "http://localhost");
    const pathname = requestUrl.pathname;

    if (req.method === "GET" && pathname === "/health") {
      const redis = getRedis();
      try {
        if (!redis) throw new Error("Redis is not configured");
        const startedAt = Date.now();
        await redis.ping();
        this.sendJson(res, 200, {
          status: "healthy",
          redis: { status: "healthy", latencyMs: Date.now() - startedAt },
          websocketClients: [...this.clients.values()].reduce((sum, room) => sum + room.size, 0),
        });
      } catch (error) {
        this.sendJson(res, 503, {
          status: "degraded",
          redis: { status: "unhealthy", error: error instanceof Error ? error.message : "Unavailable" },
        });
      }
      return true;
    }

    if (!["/rooms", "/game-api/rooms"].includes(pathname)) return false;

    const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
    if (!originAllowed(origin, this.allowedOrigins)) {
      this.sendJson(res, 403, { error: "Origin is not allowed" }, origin);
      return true;
    }

    if (req.method === "OPTIONS") {
      res.writeHead(204, this.corsHeaders(origin));
      res.end();
      return true;
    }

    if (req.method !== "POST") {
      this.sendJson(res, 405, { error: "Method not allowed" }, origin);
      return true;
    }

    const ip = requestIp(req);
    if (!this.takeRateLimit(`rooms:${ip}`, 20, 60_000)) {
      this.sendJson(res, 429, { error: "Too many room requests. Please wait a moment." }, origin);
      return true;
    }

    try {
      const body = await readJson(req);
      const action = body.action;
      let result: { sessionId: string; roomCode: string; roomId: string } | GameState;

      if (action === "create") {
        result = await createRoom({
          name: cleanText(body.name, "Name", 40),
          avatarId: cleanText(body.avatarId, "Avatar", 40),
          config: isPlainRecord(body.config) ? (body.config as Partial<MatchConfig>) : undefined,
        });
      } else if (action === "join") {
        result = await joinRoom({
          roomCode: cleanText(body.roomCode, "Room code", 8).toUpperCase(),
          name: cleanText(body.name, "Name", 40),
          avatarId: cleanText(body.avatarId, "Avatar", 40),
        });
      } else if (action === "config") {
        result = await updateConfig(
          cleanText(body.sessionId, "Session", 80),
          isPlainRecord(body.config) ? (body.config as Partial<MatchConfig>) : {},
        );
      } else {
        throw new Error("Unknown room action");
      }

      this.sendJson(res, 200, result, origin);

      const roomId = "roomId" in result ? result.roomId : undefined;
      if (roomId) {
        const state = await getGame(roomId);
        if (state) await this.broadcast(roomId, state);
      }
    } catch (error) {
      this.sendJson(res, 400, { error: error instanceof Error ? error.message : "Request failed" }, origin);
    }
    return true;
  }

  attach(
    server: HttpServer,
    onUnhandledUpgrade?: (req: IncomingMessage, socket: Duplex, head: Buffer) => void,
  ) {
    server.on("upgrade", (req, socket, head) => {
      const requestUrl = new URL(req.url ?? "/", "http://localhost");
      if (requestUrl.pathname !== "/ws") {
        if (onUnhandledUpgrade) onUnhandledUpgrade(req, socket, head);
        else socket.destroy();
        return;
      }

      const origin = typeof req.headers.origin === "string" ? req.headers.origin : undefined;
      if (!originAllowed(origin, this.allowedOrigins)) {
        socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }

      if (!this.takeRateLimit(`upgrade:${requestIp(req)}`, 30, 60_000)) {
        socket.write("HTTP/1.1 429 Too Many Requests\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }

      this.wss.handleUpgrade(req, socket, head, (ws) => {
        this.wss.emit("connection", ws, req);
      });
    });

    this.heartbeatTimer = setInterval(() => {
      const now = Date.now();
      for (const [key, bucket] of this.rateBuckets) {
        if (bucket.resetAt <= now) this.rateBuckets.delete(key);
      }
      for (const socket of this.wss.clients as Set<ClientSocket>) {
        if (socket.isAlive === false) {
          socket.terminate();
          continue;
        }
        socket.isAlive = false;
        socket.ping();
      }
    }, 25_000);

    this.tickTimer = setInterval(() => {
      for (const roomId of this.clients.keys()) {
        void withRoomLock(roomId, () => tickRoom(roomId))
          .then((state) => state && this.broadcast(roomId, state))
          .catch((error) => console.error("[Tick]", error));
      }
    }, 250);
  }

  private async handleConnection(socket: ClientSocket, req: IncomingMessage) {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    const ip = requestIp(req);
    const authTimeout = setTimeout(() => socket.close(1008, "Authentication timed out"), AUTH_TIMEOUT_MS);

    socket.on("message", (raw) => {
      void (async () => {
        let message: Record<string, unknown>;
        try {
          const parsed: unknown = JSON.parse(raw.toString());
          if (!isPlainRecord(parsed)) throw new Error("Message must be an object");
          message = parsed;
        } catch {
          socket.close(1003, "Invalid message");
          return;
        }

        if (!socket.sessionId) {
          if (message.type !== "auth" || typeof message.token !== "string") {
            socket.close(1008, "Authenticate first");
            return;
          }
          await this.authenticate(socket, message.token, authTimeout);
          return;
        }

        if (message.type === "ping") {
          socket.send(JSON.stringify({ type: "pong", serverNow: Date.now() }));
          return;
        }

        if (message.type !== "action" || !isPlainRecord(message.action)) return;
        if (!this.takeRateLimit(`actions:${ip}:${socket.sessionId}`, 60, 10_000)) {
          socket.send(JSON.stringify({ type: "error", message: "Too many actions" }));
          return;
        }

        const action = message.action;
        if (typeof action.type !== "string" || !allowedActions.has(action.type)) {
          socket.send(JSON.stringify({ type: "error", message: "Unknown action" }));
          return;
        }
        if (typeof action.actionId !== "string" || action.actionId.length > 80) {
          socket.send(JSON.stringify({ type: "error", message: "Invalid action id" }));
          return;
        }
        if (action.payload !== undefined && !isPlainRecord(action.payload)) {
          socket.send(JSON.stringify({ type: "error", message: "Invalid action payload" }));
          return;
        }

        try {
          const state = await dispatchAction(socket.sessionId, {
            type: action.type,
            actionId: action.actionId,
            payload: action.payload as Record<string, unknown> | undefined,
          });
          if (state && socket.roomId) await this.broadcast(socket.roomId, state);
        } catch (error) {
          socket.send(JSON.stringify({ type: "error", message: error instanceof Error ? error.message : "Action failed" }));
        }
      })().catch((error) => {
        console.error("[WebSocket message]", error);
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: "error", message: "Request failed" }));
        }
      });
    });

    socket.on("close", () => {
      clearTimeout(authTimeout);
      this.removeClient(socket);
      this.scheduleDisconnect(socket);
    });

    socket.on("error", (error) => console.error("[WebSocket]", error.message));
  }

  private async authenticate(
    socket: ClientSocket,
    token: string,
    authTimeout: ReturnType<typeof setTimeout>,
  ) {
    if (token.length > 80) {
      socket.close(1008, "Invalid session");
      return;
    }

    const session = await getSession(token);
    if (!session) {
      socket.close(1008, "Session expired or invalid");
      return;
    }

    clearTimeout(authTimeout);
    const pendingDisconnect = this.disconnectTimers.get(token);
    if (pendingDisconnect) {
      clearTimeout(pendingDisconnect);
      this.disconnectTimers.delete(token);
    }

    socket.sessionId = token;
    socket.roomId = session.roomId;
    if (!this.clients.has(session.roomId)) this.clients.set(session.roomId, new Set());
    this.clients.get(session.roomId)!.add(socket);

    const state = await withRoomLock(session.roomId, async () => {
      const current = await getStateForSession(token);
      if (!current) return null;
      const player = current.players.find((candidate) => candidate.id === session.playerId);
      if (!player) return null;
      if (!player.connected) {
        player.connected = true;
        current.version += 1;
        await saveGame(current);
      }
      return current;
    });

    if (!state) {
      this.removeClient(socket);
      socket.close(1008, "Room is unavailable");
      return;
    }
    await this.broadcast(session.roomId, state);
  }

  private removeClient(socket: ClientSocket) {
    if (!socket.roomId) return;
    const room = this.clients.get(socket.roomId);
    room?.delete(socket);
    if (room?.size === 0) this.clients.delete(socket.roomId);
  }

  private hasSessionConnection(roomId: string, sessionId: string) {
    return [...(this.clients.get(roomId) ?? [])].some(
      (socket) => socket.sessionId === sessionId && socket.readyState === WebSocket.OPEN,
    );
  }

  private scheduleDisconnect(socket: ClientSocket) {
    if (!socket.roomId || !socket.sessionId) return;
    if (this.hasSessionConnection(socket.roomId, socket.sessionId)) return;

    const { roomId, sessionId } = socket;
    const existing = this.disconnectTimers.get(sessionId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      this.disconnectTimers.delete(sessionId);
      if (this.hasSessionConnection(roomId, sessionId)) return;
      void withRoomLock(roomId, async () => {
        const session = await getSession(sessionId);
        const state = await getGame(roomId);
        if (!session || !state) return;
        handlePlayerDisconnect(state, session.playerId);
        await saveGame(state);
        await this.broadcast(roomId, state);
      }).catch((error) => console.error("[Disconnect]", error));
    }, DISCONNECT_GRACE_MS);

    this.disconnectTimers.set(sessionId, timer);
  }

  private async broadcast(roomId: string, state: GameState) {
    const room = this.clients.get(roomId);
    if (!room) return;
    for (const socket of room) {
      if (socket.readyState === WebSocket.OPEN && socket.sessionId) {
        socket.send(JSON.stringify({ type: "snapshot", data: publicSnapshot(state, socket.sessionId) }));
      }
    }
  }

  async shutdown() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.tickTimer) clearInterval(this.tickTimer);
    for (const timer of this.disconnectTimers.values()) clearTimeout(timer);
    for (const socket of this.wss.clients) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "server_shutdown" }));
        socket.close(1012, "Server restarting");
      }
    }
    await new Promise<void>((resolve) => this.wss.close(() => resolve()));
  }
}
