import { randomBytes, randomUUID } from "node:crypto";

export function id(prefix = "id") {
  return `${prefix}_${randomUUID()}`;
}

export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function actionId() {
  return randomUUID();
}
