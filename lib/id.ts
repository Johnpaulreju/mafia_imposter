// Browser-compatible UUID generation
function generateUUID(): string {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function generateRandomBytes(length: number): Uint8Array {
  if (typeof globalThis !== "undefined" && globalThis.crypto?.getRandomValues) {
    const bytes = new Uint8Array(length);
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  // Fallback for Node.js
  return require("node:crypto").randomBytes(length);
}

export function id(prefix = "id") {
  return `${prefix}_${generateUUID()}`;
}

export function roomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = generateRandomBytes(6);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export function actionId() {
  return generateUUID();
}
