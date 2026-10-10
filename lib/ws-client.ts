import type { ClientSnapshot } from "./types";

type SnapshotListener = (snapshot: ClientSnapshot) => void;
type ErrorListener = (message: string) => void;

class WSClient {
  private ws: WebSocket | null = null;
  private sessionId: string | null = null;
  private reconnectDelay = 1000;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;
  private snapshotListeners: Set<SnapshotListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private actionQueue: Array<{ type: string; actionId: string; payload?: Record<string, unknown> }> = [];
  private isConnecting = false;
  private authenticated = false;
  private shouldReconnect = true;

  connect(sessionId: string) {
    if (this.sessionId && this.sessionId !== sessionId) {
      this.stopHeartbeat();
      this.ws?.close();
      this.ws = null;
      this.authenticated = false;
    }
    this.sessionId = sessionId;
    this.shouldReconnect = true;
    if (this.ws?.readyState === WebSocket.OPEN && this.authenticated) return;
    if (this.isConnecting) return;
    this.doConnect();
  }

  private doConnect() {
    if (!this.sessionId) return;
    if (
      this.isConnecting ||
      this.ws?.readyState === WebSocket.CONNECTING ||
      this.ws?.readyState === WebSocket.OPEN
    ) return;

    this.isConnecting = true;
    this.authenticated = false;
    const configuredUrl = process.env.NEXT_PUBLIC_GAME_SERVER_URL?.trim();
    const baseUrl = configuredUrl || (typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");
    const wsUrl = new URL("/ws", baseUrl);
    wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";

    try {
      const socket = new WebSocket(wsUrl.toString());
      this.ws = socket;

      socket.onopen = () => {
        if (this.ws !== socket) return;
        console.log("[WS] Connected to:", wsUrl.origin);
        this.isConnecting = false;
        this.reconnectDelay = 1000;
        socket.send(JSON.stringify({ type: "auth", token: this.sessionId }));
        this.startHeartbeat();
      };

      socket.onmessage = (ev) => {
        if (this.ws !== socket) return;
        try {
          const msg = JSON.parse(ev.data);
          console.log("[WS] Received:", msg.type);
          if (msg.type === "snapshot") {
            this.authenticated = true;
            console.log("[WS] Snapshot players:", msg.data?.players?.length);
            this.snapshotListeners.forEach((listener) => listener(msg.data));
            this.flushQueue();
          } else if (msg.type === "error") {
            console.error("[WS] Error message:", msg.message);
            this.errorListeners.forEach((listener) => listener(msg.message));
          } else if (msg.type === "server_shutdown") {
            this.errorListeners.forEach((listener) => listener("Game server is restarting. Reconnecting…"));
          }
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      };

      socket.onclose = (event) => {
        if (this.ws !== socket) return;
        console.log("[WS] Closed");
        this.stopHeartbeat();
        this.isConnecting = false;
        this.authenticated = false;
        this.ws = null;
        if (event.code === 1008) {
          this.shouldReconnect = false;
          this.errorListeners.forEach((listener) => listener(event.reason || "Session expired. Please join the room again."));
        }
        if (this.shouldReconnect) this.scheduleReconnect();
      };

      socket.onerror = (err) => {
        if (this.ws !== socket) return;
        console.error("[WS] Error:", err);
        this.isConnecting = false;
      };
    } catch (e) {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect || !this.sessionId) return;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.doConnect();
    }, this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }

  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: "ping" }));
      }
    }, 20_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = null;
  }

  send(action: { type: string; actionId: string; payload?: Record<string, unknown> }) {
    this.actionQueue.push(action);
    if (this.ws?.readyState === WebSocket.OPEN && this.authenticated) {
      this.flushQueue();
    } else if (!this.isConnecting) {
      this.doConnect();
    }
  }

  private flushQueue() {
    while (this.actionQueue.length > 0 && this.ws?.readyState === WebSocket.OPEN && this.authenticated) {
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
    this.shouldReconnect = false;
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = null;
    this.stopHeartbeat();
    this.ws?.close();
    this.ws = null;
    this.sessionId = null;
    this.authenticated = false;
    this.actionQueue = [];
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN && this.authenticated;
  }
}

let instance: WSClient | null = null;

export function getWSClient(): WSClient {
  if (!instance) {
    instance = new WSClient();
  }
  return instance;
}
