import type { ClientSnapshot } from "./types";

type SnapshotListener = (snapshot: ClientSnapshot) => void;
type ErrorListener = (message: string) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectDelay = 1000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private snapshotListeners: Set<SnapshotListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private actionQueue: Array<{ type: string; actionId: string; payload?: Record<string, unknown> }> = [];
  private isConnecting = false;

  connect(sessionId: string) {
    this.sessionId = sessionId;
    if (this.ws?.readyState === WebSocket.OPEN) return;
    if (this.isConnecting) return;
    this.doConnect();
  }

  private doConnect() {
    if (!this.sessionId) return;
    if (this.isConnecting || (this.ws?.readyState === WebSocket.OPEN)) return;

    this.isConnecting = true;
    const proto = typeof window !== "undefined" && location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${proto}://${typeof window !== "undefined" ? location.host : "localhost:3000"}/api/ws?sessionId=${encodeURIComponent(this.sessionId)}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[WS] Connected to:", wsUrl);
        this.isConnecting = false;
        this.reconnectDelay = 1000;
        this.flushQueue();
      };

      this.ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          console.log("[WS] Received:", msg.type);
          if (msg.type === "snapshot") {
            console.log("[WS] Snapshot players:", msg.data?.players?.length);
            this.snapshotListeners.forEach((listener) => listener(msg.data));
          } else if (msg.type === "error") {
            console.error("[WS] Error message:", msg.message);
            this.errorListeners.forEach((listener) => listener(msg.message));
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      this.ws.onclose = () => {
        console.log("[WS] Closed");
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[WS] Error:", err);
        this.isConnecting = false;
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.doConnect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 1.5, 30000);
  }

  send(action: { type: string; actionId: string; payload?: Record<string, unknown> }) {
    this.actionQueue.push(action);
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.flushQueue();
    } else if (!this.isConnecting) {
      this.doConnect();
    }
  }

  private flushQueue() {
    while (this.actionQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN) {
      const action = this.actionQueue.shift();
      if (action) {
        this.ws.send(JSON.stringify({ type: "action", action }));
      }
    }
  }

  onSnapshot(listener: SnapshotListener) {
    this.snapshotListeners.add(listener);
    return () => this.snapshotListeners.delete(listener);
  }

  onError(listener: ErrorListener) {
    this.errorListeners.add(listener);
    return () => this.errorListeners.delete(listener);
  }

  close() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.ws?.close();
    this.ws = null;
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

let instance: WSClient | null = null;

export function getWSClient(): WSClient {
  if (!instance) {
    instance = new WSClient();
  }
  return instance;
}
