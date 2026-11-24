import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { GameRoom } from './GameRoom';
import { GlobalChat } from './GlobalChat';

export { GameRoom, GlobalChat };

export interface Env {
  GAME_ROOM: DurableObjectNamespace;
  GLOBAL_CHAT: DurableObjectNamespace;
  DB: D1Database;
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization']
}));

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', server: 'Project Blitz Edge Game Server', timestamp: Date.now() });
});

// Matchmaking endpoint: returns default regional room or requested room
app.get('/api/matchmaking', (c) => {
  const cf = (c.req.raw as any).cf;
  let defaultRoom = 'nuketown_apac_v1';
  if (cf?.continent === 'NA') defaultRoom = 'nuketown_na_v1';
  else if (cf?.continent === 'EU') defaultRoom = 'nuketown_eu_v1';

  const roomId = c.req.query('roomId') || defaultRoom;
  return c.json({
    roomId,
    map: 'Nuketown',
    mode: 'Hardpoint',
    maxPlayers: 10,
    serverUrl: `/ws/room/${roomId}`
  });
});

// Leaderboard from D1
app.get('/api/leaderboard', async (c) => {
  try {
    if (!c.env.DB) return c.json({ leaderboard: [] });
    const { results } = await c.env.DB.prepare(
      `SELECT username, kills, deaths, wins, hardpoint_time_seconds 
       FROM players 
       ORDER BY kills DESC 
       LIMIT 10`
    ).all();
    return c.json({ leaderboard: results });
  } catch (e: any) {
    return c.json({ leaderboard: [], error: e.message });
  }
});

// Update/Sync player stats after match
app.post('/api/player/sync', async (c) => {
  try {
    const body = await c.req.json();
    const { id, username, kills, deaths, won, hardpointSecs } = body;
    if (!id || !username) return c.json({ error: 'Missing fields' }, 400);

    if (c.env.DB) {
      await c.env.DB.prepare(
        `INSERT INTO players (id, username, kills, deaths, wins, losses, hardpoint_time_seconds, matches_played, last_seen)
         VALUES (?, ?, ?, ?, ?, ?, ?, 1, unixepoch())
         ON CONFLICT(id) DO UPDATE SET
           kills = kills + excluded.kills,
           deaths = deaths + excluded.deaths,
           wins = wins + excluded.wins,
           losses = losses + excluded.losses,
           hardpoint_time_seconds = hardpoint_time_seconds + excluded.hardpoint_time_seconds,
           matches_played = matches_played + 1,
           last_seen = unixepoch()`
      ).bind(
        id,
        username,
        kills || 0,
        deaths || 0,
        won ? 1 : 0,
        won ? 0 : 1,
        hardpointSecs || 0
      ).run();
    }

    return c.json({ success: true });
  } catch (e: any) {
    return c.json({ error: e.message }, 500);
  }
});

// WebSocket Game Room routing with Low-Latency Regional Edge Location Hints
app.all('/ws/room/:roomId', async (c) => {
  const roomId = c.req.param('roomId') || 'nuketown_apac_v1';
  const id = c.env.GAME_ROOM.idFromName(roomId);

  // Detect player origin to place Durable Object close to player
  const cf = (c.req.raw as any).cf;
  let hint = 'apac-se'; // Default to Southeast Asia / India edge hub
  if (cf?.continent === 'NA') hint = 'enam';
  else if (cf?.continent === 'EU') hint = 'weur';
  else if (cf?.country === 'JP' || cf?.country === 'KR') hint = 'apac-ne';

  const obj = c.env.GAME_ROOM.get(id, { locationHint: hint });
  return obj.fetch(c.req.raw);
});

// WebSocket Global World Chat routing
app.all('/ws/chat', async (c) => {
  const id = c.env.GLOBAL_CHAT.idFromName('global_chat_main');
  const obj = c.env.GLOBAL_CHAT.get(id, { locationHint: 'apac-se' });
  return obj.fetch(c.req.raw);
});

export default app;
