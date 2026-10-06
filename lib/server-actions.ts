import { getGame, getSession, saveGame, saveSession } from "./game-store";
import { addPlayer, castVote, completeTask, kickPlayer, newRoom, selectTarget, startMatch, validateConfig } from "./game-engine";
import { id } from "./id";
import type { MatchConfig } from "./types";

export async function createRoom(input: { name: string; avatarId: string; config?: Partial<MatchConfig> }) {
  const sessionId = id("session");
  const state = newRoom({ ...input, sessionId }, input.config);
  await saveGame(state);
  const { getRedis } = await import("./redis");
  const redis = getRedis();
  if (redis) await redis.set(`mafia:roomcode:${state.roomCode}`, state.roomId, { ex: 60 * 60 * 24 });
  else { const { indexMemoryRoom } = await import("./game-store"); indexMemoryRoom(state); }
  await saveSession({ sessionId, playerId: state.players[0].id, roomId: state.roomId, roomCode: state.roomCode, createdAt: Date.now(), expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  return { sessionId, roomCode: state.roomCode, roomId: state.roomId };
}

export async function joinRoom(input: { roomCode: string; name: string; avatarId: string }) {
  const rooms = await findRoomByCode(input.roomCode);
  if (!rooms) throw new Error("Room not found");
  const sessionId = id("session");
  addPlayer(rooms, { ...input, sessionId });
  const player = rooms.players.at(-1)!;
  await saveGame(rooms);
  await saveSession({ sessionId, playerId: player.id, roomId: rooms.roomId, roomCode: rooms.roomCode, createdAt: Date.now(), expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  return { sessionId, roomCode: rooms.roomCode, roomId: rooms.roomId };
}

async function findRoomByCode(roomCode: string) {
  // For the initial build, room code is stored in the active-state payload. The in-memory fallback supports local dev.
  // Production deployment should add a Redis reverse index: mafia:roomcode:{CODE} -> roomId.
  const { getRedis } = await import("./redis");
  const redis = getRedis();
  if (redis) {
    const roomId = await redis.get<string>(`mafia:roomcode:${roomCode.toUpperCase()}`);
    if (roomId) return getGame(roomId);
    return null;
  }
  const { findMemoryRoomByCode } = await import("./game-store");
  return findMemoryRoomByCode(roomCode);
}

export async function getStateForSession(sessionId: string) {
  const session = await getSession(sessionId); if (!session) return null;
  return getGame(session.roomId);
}

export async function updateConfig(sessionId: string, config: Partial<MatchConfig>) {
  const session = await getSession(sessionId); if (!session) throw new Error("Session expired");
  const state = await getGame(session.roomId); if (!state) throw new Error("Room not found");
  const host = state.players.find((p) => p.sessionId === sessionId); if (!host?.isHost) throw new Error("Only the host can update settings");
  if (state.phase !== "LOBBY") throw new Error("Settings are locked once the match starts");
  state.config = validateConfig(config); state.version++; await saveGame(state); return state;
}

export async function dispatchAction(sessionId: string, action: { type: string; actionId?: string; payload?: Record<string, unknown> }) {
  const session = await getSession(sessionId); if (!session) throw new Error("Session expired");
  const state = await getGame(session.roomId); if (!state) throw new Error("Room not found");

  // Check idempotency using actionId
  const actionIdempotencyKey = `mafia:action:${session.roomId}:${action.actionId}`;
  if (action.actionId) {
    const { getRedis } = await import("./redis");
    const redis = getRedis();
    if (redis) {
      const alreadyProcessed = await redis.get(actionIdempotencyKey);
      if (alreadyProcessed) return state; // Already processed, return current state
    }
  }

  switch (action.type) {
    case "START_MATCH": startMatch(state, sessionId); break;
    case "KICK_PLAYER": kickPlayer(state, sessionId, String(action.payload?.playerId)); break;
    case "UPDATE_CONFIG": {
      const host = state.players.find((p) => p.sessionId === sessionId);
      if (!host?.isHost || state.phase !== "LOBBY") throw new Error("Only the host can update lobby settings");
      state.config = validateConfig((action.payload?.config ?? {}) as Partial<MatchConfig>); state.version++; break;
    }
    case "SELECT_TARGET": await selectTarget(state, sessionId, String(action.payload?.targetId)); break;
    case "COMPLETE_TASK": completeTask(state, sessionId, action.payload?.answer, Number(action.payload?.timing ?? 0)); break;
    case "CAST_VOTE": castVote(state, sessionId, action.payload?.targetId ? String(action.payload.targetId) : null); break;
    default: throw new Error(`Unknown action: ${action.type}`);
  }

  await saveGame(state);

  // Mark this action as processed
  if (action.actionId) {
    const { getRedis } = await import("./redis");
    const redis = getRedis();
    if (redis) {
      // Store action ID for phase duration + 30 seconds buffer
      const phaseTTL = Math.ceil((state.phaseEndsAt ?? Date.now() + 60000 - Date.now()) / 1000) + 30;
      await redis.set(actionIdempotencyKey, "1", { ex: Math.max(10, phaseTTL) });
    }
  }

  return state;
}
