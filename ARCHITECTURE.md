# Mafia Night — Architecture Notes

```mermaid
flowchart TD
  U[Players: Web / PWA] --> V[Vercel / Next.js]
  V --> G[Authoritative Game Engine]
  G <--> R[(Upstash Redis)]
  G --> P[(Neon PostgreSQL)]
  G --> S[Story Service]
  S --> AI[AI Provider]
  S --> F[Template Fallback]
```

## Runtime state

```text
mafia:room:{roomId}
mafia:session:{sessionId}
mafia:roomcode:{ROOMCODE} -> roomId
mafia:lock:{roomId}
```

## State machine

```mermaid
stateDiagram-v2
  [*] --> LOBBY
  LOBBY --> COUNTDOWN: host starts
  COUNTDOWN --> ROLE_REVEAL
  ROLE_REVEAL --> ASSASSINATION
  ASSASSINATION --> DEATH_REVEAL
  DEATH_REVEAL --> DISCUSSION
  DISCUSSION --> VOTING
  VOTING --> TIE_BREAK: tie
  VOTING --> ELIMINATION_REVEAL: single winner
  TIE_BREAK --> ELIMINATION_REVEAL
  ELIMINATION_REVEAL --> GAME_OVER: all Mafia eliminated
  ELIMINATION_REVEAL --> GAME_OVER: max rounds reached with Mafia alive
  ELIMINATION_REVEAL --> ROUND_END
  ROUND_END --> ASSASSINATION
```

## Privacy model

```text
Public snapshot:
  player id/name/avatar/status/connection/host

Private snapshot for self:
  own role
  connected Mafia teammates if applicable
  own task
  own vote state

Game over:
  all roles
```

Dead players remain connected to the match but cannot perform live actions.

## Story pipeline

```mermaid
sequenceDiagram
  participant G as Game Engine
  participant S as Story Service
  participant AI as AI Provider
  participant R as Redis
  participant P as PostgreSQL

  G->>S: victim + witness placeholders + style
  S->>AI: isolated prompt with PLAYER_1 / VICTIM
  AI-->>S: 2–3 sentences
  S->>S: validate placeholders / length / forbidden language
  alt valid
    S->>G: rendered story
  else invalid or unavailable
    S->>G: template fallback
  end
  G->>R: live story state
  G->>P: final story history
```

## Database boundary

Redis is for ephemeral live state. PostgreSQL is for durable match history. Do not persist timer ticks. Store phase start/end timestamps.
