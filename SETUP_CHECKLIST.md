# Setup checklist

## Credentials

- [ ] Create `.env.local` from `.env.example`.
- [ ] Add Neon `DATABASE_URL`.
- [ ] Add Upstash `KV_REST_API_URL`.
- [ ] Add Upstash write `KV_REST_API_TOKEN`.
- [ ] Do not use `KV_REST_API_READ_ONLY_TOKEN` for writes.
- [ ] Add `AI_API_KEY` and `AI_MODEL`.
- [ ] Confirm `AI_API_URL` if your provider is not OpenAI-compatible at the default URL.
- [ ] Generate a strong `SESSION_SECRET`.

## Local

```bash
npm install
npm run db:migrate
npm run dev
```

## First multiplayer test

1. Open two browser windows.
2. Create a room in one.
3. Join using the room code in the other.
4. Add two more players/windows so there are at least four.
5. Start the match.
6. Refresh one player during every phase.
7. Close the host browser and verify the game-state architecture remains server-owned.
8. Run two different rooms at the same time and verify stories/names never cross between rooms.

## Before production

- [ ] Add host migration.
- [ ] Add Redis atomic locking/idempotency for actions.
- [ ] Persist every important event to PostgreSQL.
- [ ] Complete the six mini-games with server-verifiable scores.
- [ ] Add rate limiting and room creation abuse protection.
- [ ] Add profanity/name moderation if public rooms are allowed.
- [ ] Add sound assets and browser audio unlock.
- [ ] Add mobile/PWA background-resume testing.
- [ ] Load-test 25 players across many rooms.
- [ ] Test Vercel WebSocket public-beta behavior in Preview and Production.
