import { Redis } from "@upstash/redis";
import { env } from "./env";

let redis: Redis | null = null;

export function getRedis() {
  if (redis) return redis;
  if (!env.redisUrl || !env.redisToken) return null;
  redis = new Redis({ url: env.redisUrl, token: env.redisToken });
  return redis;
}

export function roomKey(roomId: string) { return `mafia:room:${roomId}`; }
export function sessionKey(sessionId: string) { return `mafia:session:${sessionId}`; }
export function lockKey(roomId: string) { return `mafia:lock:${roomId}`; }
