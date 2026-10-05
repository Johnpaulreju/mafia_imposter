import { getRedis, roomKey, sessionKey } from "./redis";
import type { GameState, SessionRecord } from "./types";

const memoryRooms = new Map<string, GameState>();
const memorySessions = new Map<string, SessionRecord>();

export function indexMemoryRoom(state: GameState) { memoryRooms.set(state.roomId, state); }
export function findMemoryRoomByCode(code: string) { return [...memoryRooms.values()].find((r) => r.roomCode === code.toUpperCase()) ?? null; }

export async function saveGame(state: GameState) {
  const redis = getRedis();
  if (redis) {
    await redis.set(roomKey(state.roomId), state, { ex: 60 * 60 * 24 });
    await redis.set(`mafia:roomcode:${state.roomCode}`, state.roomId, { ex: 60 * 60 * 24 });
  } else {
    memoryRooms.set(state.roomId, state);
  }
  return state;
}

export async function getGame(roomId: string) {
  const redis = getRedis();
  if (redis) return await redis.get<GameState>(roomKey(roomId));
  return memoryRooms.get(roomId) ?? null;
}

export async function saveSession(session: SessionRecord) {
  const redis = getRedis();
  if (redis) {
    await redis.set(sessionKey(session.sessionId), session, { ex: 60 * 60 * 24 * 30 });
  } else {
    memorySessions.set(session.sessionId, session);
  }
}

export async function getSession(sessionId: string) {
  const redis = getRedis();
  if (redis) return await redis.get<SessionRecord>(sessionKey(sessionId));
  return memorySessions.get(sessionId) ?? null;
}

export async function deleteSession(sessionId: string) {
  const redis = getRedis();
  if (redis) await redis.del(sessionKey(sessionId));
  else memorySessions.delete(sessionId);
}
