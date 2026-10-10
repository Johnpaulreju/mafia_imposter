# Deploying Mafia Night

The repository deploys as two services from the same GitHub repository:

- Vercel serves the Next.js user interface.
- Render owns room creation, WebSocket connections, game actions, and timers.
- Upstash Redis stores active rooms and player sessions.

There is no browser API key. A player receives a random session token after
creating or joining a room, then sends that token as the first WebSocket
message. Never add Redis, database, AI, or signing secrets to a
`NEXT_PUBLIC_*` variable.

## 1. Local verification

Copy `.env.example` to `.env.local`, add Upstash values if you want persistent
local rooms, then run:

```bash
pnpm install
pnpm dev
```

The combined local server exposes:

- UI: `http://localhost:3000`
- room API: `http://localhost:3000/game-api/rooms`
- WebSocket: `ws://localhost:3000/ws`

`NEXT_PUBLIC_GAME_SERVER_URL` should remain empty during combined local
development.

## 2. Push to GitHub

Review the diff and commit only the intended files:

```bash
git status
git diff --check
git add .env.example .gitignore README.md DEPLOYMENT.md render.yaml package.json pnpm-workspace.yaml \
  server server.mjs app/page.tsx app/api/health/route.ts lib/game-engine.ts \
  lib/game-store.ts lib/room-lock.ts lib/server-actions.ts lib/ws-client.ts \
  api/ws.ts app/api/rooms/route.ts tsconfig.tsbuildinfo
git commit -m "Add Render realtime game server"
git push origin main
```

Do not add `.env` or `.env.local`.

## 3. Create or reuse Upstash Redis

Copy these two values from the Upstash REST API section:

```text
KV_REST_API_URL
KV_REST_API_TOKEN
```

Use the write token, not the read-only token.

## 4. Deploy Render

1. In Render, choose **New > Blueprint**.
2. Connect the GitHub repository.
3. Render detects `render.yaml` and creates `mafia-imposter-realtime`.
4. Enter the requested environment values:
   - `ALLOWED_ORIGINS`: the exact Vercel production origin, such as
     `https://mafia-imposter.vercel.app`
   - `KV_REST_API_URL`: the Upstash REST URL
   - `KV_REST_API_TOKEN`: the Upstash write token
5. Deploy and wait for `/health` to report HTTP 200.

The Render URL will look like:

```text
https://mafia-imposter-realtime.onrender.com
```

Test it in a browser:

```text
https://mafia-imposter-realtime.onrender.com/health
```

Do not add `/ws` to the Vercel environment variable. The client derives
`wss://.../ws` automatically.

If the Vercel production URL is not known yet, deploy Vercel once, copy its
production URL, set `ALLOWED_ORIGINS` in Render, and redeploy/restart Render.

## 5. Configure Vercel

Keep the Vercel project Root Directory at the repository root. Add this
Production environment variable:

```text
NEXT_PUBLIC_GAME_SERVER_URL=https://mafia-imposter-realtime.onrender.com
```

Use your actual Render URL and do not add a trailing slash. Redeploy Vercel
after adding it because public Next.js variables are embedded during build.

For a Vercel Preview deployment, add its exact origin to `ALLOWED_ORIGINS` on
Render. Avoid `*.vercel.app`; that would allow unrelated Vercel sites.

## 6. Production smoke test

1. Open the Vercel app in two normal/private browser windows.
2. Create a room in the first window.
3. Join with the room code in the second window.
4. Confirm both lobbies update immediately.
5. Refresh one window and confirm it reconnects.
6. Repeat with four players and start a match.
7. Check Render logs for origin, authentication, or Redis errors.

The Render free plan can sleep when inactive and cold starts can delay the
first room connection. Use paid always-on compute before relying on it for live
game sessions.
