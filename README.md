# Mafia Night 🎭

**A cinematic real-time multiplayer social-deduction game built for friends.**

Mafia Night transforms the classic Mafia party game into an interactive multiplayer experience with hidden roles, dynamic rounds, real-time voting, mini-games, suspenseful death reveals, and AI-generated mystery stories.

Players can host or join rooms, choose between **In-Person** and **Remote** play modes, configure Mafia and match rules, complete unique mini-games, investigate suspicious players, and vote to eliminate suspected imposters.

Every match is designed to feel different, with randomized role assignment, rotating tasks, dynamic storytelling, and persistent match statistics.

## ✨ Highlights

- 🎭 **Blind & Connected Mafia** — Choose whether Mafia members know each other.
- 🏠 **In-Person & Remote Modes** — Different storytelling experiences depending on how players are playing.
- ⚡ **Real-Time Multiplayer** — Live rooms, phases, voting, timers, and reconnect support.
- 🎮 **Interactive Mini-Games** — Complete different tasks during every Mafia round.
- 🤖 **AI Mystery Stories** — Each death can generate a short cinematic story without revealing the killer.
- 🔒 **Room-Isolated AI** — Story generation only receives the current room/match context.
- 🗳️ **Dynamic Voting** — Vote changes, tie-breaks, and configurable voting rules.
- 🔄 **Reconnect-Safe** — Refreshing or temporarily disconnecting should not destroy game progress.
- 🏆 **Post-Game Statistics** — Discover the fastest player, best detective, deadliest Mafia, and more.
- 🎬 **Cinematic Game Flow** — Countdown, role reveals, suspense sequences, death reveals, elimination reveals, and final results.
- 🔐 **Server-Authoritative Architecture** — Roles, votes, timers, win conditions, and game state are controlled by the server.
- 📊 **Persistent Match History** — Completed matches, tasks, votes, stories, events, and statistics can be stored for future analysis.

## 🏗️ Architecture

```text
Players
   │
   ▼
Next.js / PWA
   │
   │ HTTPS / WebSocket
   ▼
Game Engine
   │
   ├───────────────┐
   ▼               ▼
Upstash Redis    PostgreSQL
Live State       Persistent Data
   │               │
   │               └── Matches
   │               └── Players
   │               └── Votes
   │               └── Tasks
   │               └── Stories
   │               └── Statistics
   │
   ▼
AI Story Service
