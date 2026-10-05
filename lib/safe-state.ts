import type { ClientSnapshot, GameState, Player } from "./types";

export function publicSnapshot(state: GameState, sessionId: string): ClientSnapshot {
  const me = state.players.find((p) => p.sessionId === sessionId) ?? null;
  const players = state.players.map((player): Player => {
    const isMe = player.sessionId === sessionId;
    const canSeeRole = isMe || state.phase === "GAME_OVER";
    const canSeeMafiaTeammates = isMe && player.role === "IMPOSTER" && state.config.mafiaMode === "CONNECTED";
    return {
      ...player,
      sessionId: "",
      role: canSeeRole ? player.role : undefined,
      teamMates: canSeeMafiaTeammates ? player.teamMates : undefined,
    };
  });
  const safeMe = me ? players.find((p) => p.id === me.id) ?? null : null;
  return { ...state, players, me: safeMe, serverNow: Date.now() };
}
