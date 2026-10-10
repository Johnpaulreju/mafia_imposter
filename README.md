# Mafia Night

Production-oriented starter for the Mafia social-deduction game we designed together.

## Stack

- Next.js 16.3.8 + React 19.3
- Tailwind CSS 4.3
- Vercel for the Next.js frontend
- Render Web Service + `ws` for the authoritative realtime game server
- Upstash Redis for live state/session state
- Neon/PostgreSQL for durable match history
- Provider-agnostic OpenAI-compatible AI endpoint for story generation
- TypeScript

The browser connects directly to the Render service for room HTTP requests and
WebSocket game traffic. See `DEPLOYMENT.md` for the exact deployment sequence.

## 1. Install

```bash
pnpm install
cp .env.example .env.local
```

Fill in `.env.local` with your Neon, Upstash and AI values.

## 2. Database

```bash
pnpm db:migrate
```

## 3. Run locally

```bash
pnpm dev
```

Open http://localhost:3000.

## 4. Environment variables

Required for shared persistence:

- `DATABASE_URL` or `POSTGRES_URL`
- `KV_REST_API_URL` + `KV_REST_API_TOKEN`

Deployment routing:

- `NEXT_PUBLIC_GAME_SERVER_URL` on Vercel, set to the Render HTTPS origin
- `ALLOWED_ORIGINS` on Render, set to the exact Vercel origin

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

The next engineering pass should add the six fully playable mini-games, reconcile PostgreSQL match-history writes with the migration schema, add fairness-weighted role history, audio/haptics, distributed coordination for horizontal scaling, and larger production WebSocket load tests.

## Suggested production deployment order

1. Push this single repository to GitHub.
2. Create Upstash Redis and copy its REST URL and write token.
3. Deploy `render.yaml` as a Render Blueprint.
4. Set Render `ALLOWED_ORIGINS` to the exact Vercel production origin.
5. Set Vercel `NEXT_PUBLIC_GAME_SERVER_URL` to the Render HTTPS origin.
6. Redeploy Vercel and test 4–25 browser sessions.
7. Test refresh/disconnect/reconnect in every phase.
8. Test host closing the browser and host migration.
9. Test AI failure and verify template fallback.
10. Test room isolation with multiple simultaneous rooms.


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
