# Mafia Night

Production-oriented starter for the Mafia social-deduction game we designed together.

## Stack

- Next.js 16.3.8 + React 19.3
- Tailwind CSS 4.3
- Vercel Functions + WebSockets (public beta)
- Upstash Redis for live state/session state
- Neon/PostgreSQL for durable match history
- Provider-agnostic OpenAI-compatible AI endpoint for story generation
- TypeScript

Vercel currently supports WebSocket connections from Functions in public beta; connections are pinned to a Function and durable shared state should live in Redis. See the official Vercel WebSocket guidance before production launch. citehttps://vercel.com/changelog/websocket-support-is-now-in-public-beta

## 1. Install

```bash
npm install
cp .env.example .env.local
```

Fill in `.env.local` with your Neon, Upstash and AI values.

## 2. Database

```bash
npm run db:migrate
```

## 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000.

## 4. Environment variables

Required for shared persistence:

- `DATABASE_URL` or `POSTGRES_URL`
- `REDIS_URL` + `KV_REST_API_TOKEN`, OR `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- `SESSION_SECRET`

AI story generation:

- `AI_API_KEY`
- `AI_MODEL`
- optional `AI_API_URL`

The app intentionally falls back to deterministic template stories if the AI key/model is missing or the provider fails. A story API outage must never stop the game.

## 5. Important implementation notes

### Room isolation

Every active room is stored under a room-specific Redis key. Every session points to exactly one room. Match state is nested inside that room state and story generation only receives the current victim/witness placeholders.

### AI story isolation

The AI receives placeholders such as `PLAYER_1` and `VICTIM`, never a global list of users. The server performs the final replacement with names from the current room only. Unknown-name leakage causes validation failure and falls back to a local template.

### Refresh / reconnect

The browser stores only `mafia_session`. On reconnect the server resolves the session, loads the authoritative room state, and sends a fresh snapshot. Roles are not stored in localStorage.

### Timers

The server stores absolute `phaseEndsAt`. Clients render the countdown locally. No client timer is authoritative.

### Action authority

Clients request actions. The game engine validates them. The server writes the new state and broadcasts personalized snapshots.

## Current starter scope

Implemented:

- onboarding
- host/join room
- avatar/name selection
- lobby
- room code/share link
- in-person vs remote mode
- Blind vs Connected Mafia
- host settings
- round-based state machine
- secret role reveal
- Mafia target selection
- rotating task assignment
- task completion placeholder interaction
- death reveal
- AI/template story service
- narrator selection for in-person mode
- remote story display
- discussion timer
- voting + vote change
- tie-break
- elimination reveal
- game-over role reveal
- Redis-backed active state
- Neon/Postgres migration schema
- reconnect snapshot architecture

The next engineering pass should add the six fully playable mini-games, persistent match finalization into PostgreSQL, host migration, fairness-weighted role history, audio/haptics, rate limiting, action idempotency, and production-grade WebSocket deployment tests.

## Suggested production deployment order

1. Create Vercel project and connect GitHub.
2. Create Upstash Redis integration in Vercel.
3. Create Neon PostgreSQL database.
4. Add environment variables.
5. Run migration against Neon.
6. Deploy Preview.
7. Test 4–25 browser sessions.
8. Test refresh/disconnect/reconnect in every phase.
9. Test host closing the browser and host migration.
10. Test AI failure and verify template fallback.
11. Test room isolation with multiple simultaneous rooms.
12. Only then move to production.


## Environment mapping for the Redis variables you showed

Your Vercel/Upstash panel can expose several KV variables. For this game use:

```env
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="...write token..."
```

Do **not** put `KV_REST_API_READ_ONLY_TOKEN` into `KV_REST_API_TOKEN`. The game engine must write room state, sessions, votes and timers, so a read-only token cannot power the server.

`KV_URL` is not required by this starter. `REDIS_URL` is also not required when the Upstash REST variables are available.

For Neon:

```env
DATABASE_URL="postgresql://..."
```

For AI:

```env
AI_API_KEY="..."
AI_MODEL="..."
AI_API_URL="https://your-provider.example/v1/chat/completions"
```

If your provider uses an OpenAI-compatible chat-completions endpoint, no AI code change is needed.
