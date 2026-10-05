CREATE TABLE IF NOT EXISTS rooms (
  id TEXT PRIMARY KEY,
  room_code VARCHAR(8) UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  host_player_id TEXT,
  max_players INTEGER NOT NULL DEFAULT 12,
  expires_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  display_name VARCHAR(40) NOT NULL,
  avatar_id VARCHAR(40) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  match_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  winner TEXT,
  config JSONB NOT NULL,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  UNIQUE(room_id, match_number)
);

CREATE TABLE IF NOT EXISTS match_players (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  display_name VARCHAR(40) NOT NULL,
  avatar_id VARCHAR(40) NOT NULL,
  role TEXT,
  final_status TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  eliminated_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS rounds (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  victim_player_id TEXT,
  eliminated_player_id TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  UNIQUE(match_id, round_number)
);

CREATE TABLE IF NOT EXISTS tasks (
  id BIGSERIAL PRIMARY KEY,
  round_id BIGINT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  game_type TEXT NOT NULL,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  score NUMERIC(5,2),
  accuracy NUMERIC(5,2),
  completed BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS votes (
  id BIGSERIAL PRIMARY KEY,
  round_id BIGINT NOT NULL REFERENCES rounds(id) ON DELETE CASCADE,
  voter_player_id TEXT NOT NULL,
  target_player_id TEXT,
  vote_number INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eliminations (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_id BIGINT REFERENCES rounds(id) ON DELETE SET NULL,
  player_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  role_at_elimination TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_id BIGINT REFERENCES rounds(id) ON DELETE SET NULL,
  victim_player_id TEXT NOT NULL,
  reader_player_id TEXT,
  play_mode TEXT NOT NULL,
  style TEXT NOT NULL,
  story_text TEXT NOT NULL,
  source TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS player_stats (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  tasks_completed INTEGER NOT NULL DEFAULT 0,
  average_task_time_ms INTEGER NOT NULL DEFAULT 0,
  best_task_time_ms INTEGER NOT NULL DEFAULT 0,
  average_accuracy NUMERIC(5,2) NOT NULL DEFAULT 0,
  votes_cast INTEGER NOT NULL DEFAULT 0,
  correct_votes INTEGER NOT NULL DEFAULT 0,
  wrong_votes INTEGER NOT NULL DEFAULT 0,
  times_targeted INTEGER NOT NULL DEFAULT 0,
  rounds_survived INTEGER NOT NULL DEFAULT 0,
  impostor_kills INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS role_history (
  id BIGSERIAL PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS match_events (
  id BIGSERIAL PRIMARY KEY,
  match_id TEXT NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  round_id BIGINT,
  event_type TEXT NOT NULL,
  actor_player_id TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_room ON players(room_id);
CREATE INDEX IF NOT EXISTS idx_matches_room ON matches(room_id);
CREATE INDEX IF NOT EXISTS idx_rounds_match ON rounds(match_id);
CREATE INDEX IF NOT EXISTS idx_events_match ON match_events(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_role_history_room_player ON role_history(room_id, player_id, created_at DESC);
