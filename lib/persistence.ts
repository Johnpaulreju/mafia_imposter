import { getDb } from "./db";
import type { GameState } from "./types";

export async function persistMatch(state: GameState) {
  const sql = getDb();
  if (!sql || state.matchNumber < 1) return;
  const room = state.roomId;
  await sql.begin(async (tx) => {
    await tx`INSERT INTO rooms (id, room_code, status, host_player_id, max_players) VALUES (${room}, ${state.roomCode}, ${state.phase === "GAME_OVER" ? "COMPLETED" : "ACTIVE"}, ${state.players.find(p=>p.isHost)?.id ?? null}, ${state.config.maxPlayers}) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, max_players=EXCLUDED.max_players`;
    for (const p of state.players) {
      await tx`INSERT INTO players (id, room_id, display_name, avatar_id) VALUES (${p.id}, ${room}, ${p.name}, ${p.avatarId}) ON CONFLICT (id) DO UPDATE SET display_name=EXCLUDED.display_name, avatar_id=EXCLUDED.avatar_id`;
    }
    await tx`INSERT INTO matches (id, room_id, match_number, status, winner, config, started_at, ended_at) VALUES (${state.matchId}, ${room}, ${state.matchNumber}, ${state.phase === "GAME_OVER" ? "COMPLETED" : "ACTIVE"}, ${state.winner}, ${JSON.stringify(state.config)}, ${new Date(state.phaseStartedAt ?? Date.now())}, ${state.phase === "GAME_OVER" ? new Date() : null}) ON CONFLICT (id) DO UPDATE SET status=EXCLUDED.status, winner=EXCLUDED.winner, ended_at=EXCLUDED.ended_at`;
    for (const p of state.players) {
      await tx`INSERT INTO match_players (match_id, player_id, display_name, avatar_id, role, final_status, eliminated_at) VALUES (${state.matchId}, ${p.id}, ${p.name}, ${p.avatarId}, ${p.role ?? null}, ${p.status}, NULL) ON CONFLICT DO NOTHING`;
    }
  });
}
