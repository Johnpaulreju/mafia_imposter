const roomQueues = new Map<string, Promise<void>>();

/**
 * Serializes mutations for a room inside a single Node process.
 *
 * The first Render deployment intentionally runs one instance. If the service
 * is horizontally scaled later, replace this with a distributed lock or an
 * atomic Redis transaction/Lua script.
 */
export async function withRoomLock<T>(roomId: string, task: () => Promise<T>): Promise<T> {
  const previous = roomQueues.get(roomId) ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => gate);
  roomQueues.set(roomId, tail);

  await previous;
  try {
    return await task();
  } finally {
    release();
    if (roomQueues.get(roomId) === tail) roomQueues.delete(roomId);
  }
}
