import type { ClientSnapshot, GameState, Player, TaskState } from "./types";

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

  // Filter tasks: Only include personal task for current player, without answer
  const safeTasks: Record<string, TaskState> = {};
  if (me) {
    for (const [key, task] of Object.entries(state.tasks)) {
      if (task.playerId === me.id) {
        // Personal task: include game/startedAt/completedAt/score/accuracy/completed, NEVER answer
        safeTasks[key] = {
          playerId: task.playerId,
          game: task.game,
          startedAt: task.startedAt,
          completedAt: task.completedAt,
          score: task.score,
          accuracy: task.accuracy,
          completed: task.completed,
          // Explicitly exclude: answer (NEVER send to client)
        };
      }
    }
  }

  // The victim becomes a silent observer. In-person games give the story to one
  // random living narrator; remote games show it to every living player.
  let safeStory = undefined;
  if (state.story && state.phase !== "GAME_OVER") {
    const isAlive = me?.status === "ALIVE";

    if (isAlive) {
      if (state.config.playMode === "IN_PERSON") {
        if (state.story.readerId === me?.id) {
          safeStory = state.story;
        }
      } else {
        safeStory = state.story;
      }
    }
  }

  // Include story if GAME_OVER (reveal all information)
  if (state.phase === "GAME_OVER" && state.story) {
    safeStory = state.story;
  }

  const safeMe = me ? players.find((p) => p.id === me.id) ?? null : null;

  return {
    ...state,
    players,
    me: safeMe,
    tasks: safeTasks,
    story: safeStory,
    serverNow: Date.now(),
  };
}
