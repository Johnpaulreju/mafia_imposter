// Phase 10: Network Resilience - Disconnect/reconnect handling

export interface NetworkState {
  isConnected: boolean;
  lastSeen: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectDelayMs: number;
}

export function createNetworkState(): NetworkState {
  return {
    isConnected: false,
    lastSeen: Date.now(),
    reconnectAttempts: 0,
    maxReconnectAttempts: 10,
    reconnectDelayMs: 1000,
  };
}

export function calculateBackoffDelay(attempts: number, baseDelay: number = 1000): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 30s (capped)
  const exponential = Math.min(baseDelay * Math.pow(2, attempts), 30000);
  // Add jitter: ±10%
  const jitter = exponential * (0.9 + Math.random() * 0.2);
  return Math.round(jitter);
}

export function shouldAttemptReconnect(state: NetworkState): boolean {
  if (state.isConnected) return false;
  if (state.reconnectAttempts >= state.maxReconnectAttempts) return false;
  
  const timeSinceLastAttempt = Date.now() - state.lastSeen;
  const requiredDelay = calculateBackoffDelay(state.reconnectAttempts);
  
  return timeSinceLastAttempt >= requiredDelay;
}

export interface DisconnectScenario {
  name: string;
  description: string;
  expectedBehavior: string;
}

// Test scenarios for Phase 10
export const reconnectScenarios: DisconnectScenario[] = [
  {
    name: "LOBBY_DISCONNECT",
    description: "Host disconnects during LOBBY phase",
    expectedBehavior: "Host migrates to next eligible player, game remains open"
  },
  {
    name: "ASSASSINATION_DISCONNECT",
    description: "Player disconnects during ASSASSINATION phase",
    expectedBehavior: "Player marked offline, task timeout handled, game continues"
  },
  {
    name: "VOTING_DISCONNECT",
    description: "Player disconnects during VOTING phase",
    expectedBehavior: "Player vote locked in or abstained, voting continues without them"
  },
  {
    name: "QUICK_RECONNECT",
    description: "Player reconnects within 5 seconds",
    expectedBehavior: "State restored, player resumes as if never disconnected"
  },
  {
    name: "LONG_DISCONNECT",
    description: "Player offline for >30 seconds during match",
    expectedBehavior: "Player rejoins but match may have advanced"
  },
  {
    name: "MULTIPLE_DISCONNECTS",
    description: "Same player disconnects and reconnects 3+ times",
    expectedBehavior: "Each reconnect handled gracefully, exponential backoff applied"
  },
  {
    name: "NETWORK_PARTITION",
    description: "WebSocket connection dies abruptly",
    expectedBehavior: "Client detects, attempts reconnect with backoff"
  },
  {
    name: "SERVER_RESTART",
    description: "Server restarts during active game",
    expectedBehavior: "Client reconnects, game state restored from DB"
  }
];

export function validateNetworkResilience(
  scenario: DisconnectScenario,
  result: any
): { passed: boolean; reason: string } {
  // Implement scenario validation
  if (!result) {
    return { passed: false, reason: "No result provided" };
  }

  switch (scenario.name) {
    case "LOBBY_DISCONNECT":
      return {
        passed: result.hostMigrated === true,
        reason: result.hostMigrated
          ? "Host successfully migrated"
          : "Host migration failed",
      };

    case "ASSASSINATION_DISCONNECT":
      return {
        passed: result.playerMarkedOffline === true && result.gameActive === true,
        reason:
          result.playerMarkedOffline && result.gameActive
            ? "Player offline, game continues"
            : "Game state inconsistent",
      };

    case "QUICK_RECONNECT":
      return {
        passed: result.stateRestored === true && result.reconnectTime < 5000,
        reason:
          result.stateRestored && result.reconnectTime < 5000
            ? "State restored within 5s"
            : "Reconnect too slow or state lost",
      };

    case "MULTIPLE_DISCONNECTS":
      return {
        passed:
          result.reconnectCount >= 3 &&
          result.allSuccessful === true &&
          result.backoffApplied === true,
        reason:
          result.allSuccessful && result.backoffApplied
            ? "All reconnects successful with backoff"
            : "Reconnect handling inconsistent",
      };

    default:
      return { passed: !!result.success, reason: result.reason || "Unknown" };
  }
}
