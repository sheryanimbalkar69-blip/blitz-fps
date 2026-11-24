-- Schema for blitz_game_db

CREATE TABLE IF NOT EXISTS players (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  kills INTEGER DEFAULT 0,
  deaths INTEGER DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  hardpoint_time_seconds INTEGER DEFAULT 0,
  matches_played INTEGER DEFAULT 0,
  last_seen INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS matches (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL,
  winner_team TEXT,
  alpha_score INTEGER DEFAULT 0,
  bravo_score INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  ended_at INTEGER DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS global_chat_logs (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp INTEGER DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_players_kills ON players (kills DESC);
CREATE INDEX IF NOT EXISTS idx_players_wins ON players (wins DESC);
