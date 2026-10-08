import { getDb } from "./db";
import type { GameState } from "./types";

export async function persistMatch(state: GameState) {
  const sql = getDb();
  if (!sql || state.matchNumber < 1) return;

  const room = state.roomId;
  try {
    await sql.begin(async (tx) => {
      // Save room
      await tx`INSERT INTO rooms (id, room_code, status, host_player_id, max_players) VALUES (${room}, ${state.roomCode}, ${state.phase === "GAME_OVER" ? "COMPLETED" : "ACTIVE"}, ${state.players.find(p=>p.isHost)?.id ?? null}, ${state.config.maxPlayers}) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, max_players=EXCLUDED.max_players`;

      // Save players
      for (const p of state.players) {
        await tx`INSERT INTO players (id, room_id, display_name, avatar_id) VALUES (${p.id}, ${room}, ${p.name}, ${p.avatarId}) ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, avatar_id=EXCLUDED.avatar_id`;
      }

      // Save match
      await tx`INSERT INTO matches (id, room_id, match_number, status, winner, config, started_at, ended_at) VALUES (${state.matchId}, ${room}, ${state.matchNumber}, ${state.phase === "GAME_OVER" ? "COMPLETED" : "ACTIVE"}, ${state.winner}, ${JSON.stringify(state.config)}, ${new Date(state.phaseStartedAt ?? Date.now())}, ${state.phase === "GAME_OVER" ? new Date() : null}) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, winner=EXCLUDED.winner, ended_at=EXCLUDED.ended_at`;

      // Save match_players (roles and elimination status)
      for (const p of state.players) {
        await tx`INSERT INTO match_players (match_id, player_id, display_name, avatar_id, role, final_status, eliminated_at) VALUES (${state.matchId}, ${p.id}, ${p.name}, ${p.avatarId}, ${p.role ?? null}, ${p.status}, NULL) ON CONFLICT DO NOTHING`;
      }

      // Save rounds (only if round > 0)
      if (state.round > 0) {
        const roundStatus = state.phase === "GAME_OVER" ? "COMPLETED" : state.phase === "ROUND_END" ? "COMPLETED" : "ACTIVE";
        await tx`INSERT INTO rounds (id, match_id, round_number, victim_id, elimination_id, status, started_at, ended_at) VALUES (${state.matchId}-r${state.round}, ${state.matchId}, ${state.round}, ${state.currentVictimId ?? null}, ${state.eliminatedThisRound ?? null}, ${roundStatus}, NOW(), ${roundStatus === "COMPLETED" ? "NOW()" : null}) ON CONFLICT (match_id, round_number) DO UPDATE SET victim_id=EXCLUDED.victim_id, elimination_id=EXCLUDED.elimination_id, status=EXCLUDED.status, ended_at=EXCLUDED.ended_at`;
      }

      // Save tasks
      for (const [taskId, task] of Object.entries(state.tasks)) {
        await tx`INSERT INTO tasks (id, match_id, round, player_id, game, started_at, completed_at, score, accuracy) VALUES (${taskId}, ${state.matchId}, ${state.round}, ${task.playerId}, ${task.game}, ${new Date(task.startedAt)}, ${task.completedAt ? new Date(task.completedAt) : null}, ${task.score ?? null}, ${task.accuracy ?? null}) ON CONFLICT (id) DO UPDATE SET completed_at=EXCLUDED.completed_at, score=EXCLUDED.score, accuracy=EXCLUDED.accuracy`;
      }

      // Save votes
      for (const [playerId, targetId] of Object.entries(state.votes)) {
        if (targetId !== null) {
          await tx`INSERT INTO votes (match_id, round, voter_id, target_id, cast_at) VALUES (${state.matchId}, ${state.round}, ${playerId}, ${targetId}, NOW()) ON CONFLICT (match_id, round, voter_id) DO UPDATE SET target_id=EXCLUDED.target_id, cast_at=NOW()`;
        }
      }

      // Save eliminations
      if (state.eliminatedThisRound) {
        await tx`INSERT INTO eliminations (id, match_id, round, eliminated_id, role, status, eliminated_at) VALUES (${state.matchId}-e${state.round}, ${state.matchId}, ${state.round}, ${state.eliminatedThisRound}, ${state.lastEliminationRole ?? null}, "COMPLETE", NOW()) ON CONFLICT (match_id, round) DO UPDATE SET eliminated_id=EXCLUDED.eliminated_id, role=EXCLUDED.role`;
      }

      // Save story
      if (state.story && state.story.ready) {
        await tx`INSERT INTO stories (id, match_id, round, victim_id, reader_id, text, style, created_at) VALUES (${state.story.id}, ${state.matchId}, ${state.round}, ${state.story.victimId}, ${state.story.readerId ?? null}, ${state.story.text}, ${state.story.style}, NOW()) ON CONFLICT (match_id, round) DO UPDATE SET text=EXCLUDED.text, reader_id=EXCLUDED.reader_id`;
      }

      // Save player stats at end of match
      if (state.phase === "GAME_OVER") {
        for (const p of state.players) {
          const playerTasks = Object.values(state.tasks).filter((t) => t.playerId === p.id && t.completed);
          const avgScore = playerTasks.length > 0 ? playerTasks.reduce((sum, t) => sum + (t.score ?? 0), 0) / playerTasks.length : 0;
          const playerVotes = Object.entries(state.votes).filter(([voter]) => voter === p.id);

          await tx`INSERT INTO player_stats (match_id, player_id, role, final_status, tasks_completed, avg_task_score, votes_cast, survived_rounds) VALUES (${state.matchId}, ${p.id}, ${p.role ?? null}, ${p.status}, ${playerTasks.length}, ${Math.round(avgScore)}, ${playerVotes.length}, ${p.roundsSurvived}) ON CONFLICT (match_id, player_id) DO UPDATE SET final_status=EXCLUDED.final_status, tasks_completed=EXCLUDED.tasks_completed, avg_task_score=EXCLUDED.avg_task_score, votes_cast=EXCLUDED.votes_cast, survived_rounds=EXCLUDED.survived_rounds`;
        }
      }
    });
  } catch (e) {
    // Silently fail if persistence is unavailable (game continues)
    console.error("[Persistence] Save failed:", e instanceof Error ? e.message : String(e));
  }
}
