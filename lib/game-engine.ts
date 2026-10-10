import { randomInt } from "node:crypto";
import { DEFAULT_CONFIG, STORY_REVEAL_SECONDS, TASK_GAMES } from "./constants";
import { getGame, saveGame } from "./game-store";
import { id, roomCode } from "./id";
import { generateStory } from "./story";
import { persistMatch } from "./persistence";
import { generateTaskAnswer, validateTaskCompletion } from "./task-validator";
import type { GameState, MatchConfig, Player, Role, TaskGame } from "./types";

export function validateConfig(config: Partial<MatchConfig>): MatchConfig {
  const merged = { ...DEFAULT_CONFIG, ...config };
  merged.maxPlayers = Math.min(25, Math.max(4, Number(merged.maxPlayers) || DEFAULT_CONFIG.maxPlayers));
  merged.rounds = Math.min(8, Math.max(1, Number(merged.rounds) || 4));
  merged.imposters = Math.min(3, Math.max(1, Number(merged.imposters) || 1));
  merged.assassinationTime = Math.min(120, Math.max(10, Number(merged.assassinationTime) || DEFAULT_CONFIG.assassinationTime));
  merged.discussionTime = Math.min(120, Math.max(10, Number(merged.discussionTime) || DEFAULT_CONFIG.discussionTime));
  merged.votingTime = Math.min(120, Math.max(10, Number(merged.votingTime) || DEFAULT_CONFIG.votingTime));
  if (merged.imposters >= merged.maxPlayers) merged.imposters = 1;
  return merged;
}

export function newRoom(host: { name: string; avatarId: string; sessionId: string }, config?: Partial<MatchConfig>): GameState {
  const roomId = id("room");
  const playerId = id("player");
  const code = roomCode();
  const player: Player = { id: playerId, sessionId: host.sessionId, name: host.name, avatarId: host.avatarId, isHost: true, connected: true, status: "ALIVE", roundsSurvived: 0, timesTargeted: 0 };
  return {
    version: 1, roomCode: code, roomId, matchId: id("match"), matchNumber: 0, phase: "LOBBY", round: 0,
    config: validateConfig(config ?? {}), players: [player], votes: {}, tieCandidates: [], tasks: {}, winner: null,
    message: "Waiting for players",
  };
}

export function addPlayer(state: GameState, input: { name: string; avatarId: string; sessionId: string }) {
  if (state.phase !== "LOBBY") throw new Error("This room is already in a match");
  if (state.players.length >= state.config.maxPlayers) throw new Error("Room is full");
  if (state.players.some((p) => p.name.toLowerCase() === input.name.toLowerCase())) throw new Error("That name is already in use");
  const player: Player = { id: id("player"), sessionId: input.sessionId, name: input.name, avatarId: input.avatarId, isHost: false, connected: true, status: "ALIVE", roundsSurvived: 0, timesTargeted: 0 };
  state.players.push(player); state.version++; return state;
}

export function kickPlayer(state: GameState, hostSessionId: string, playerId: string) {
  const host = state.players.find((p) => p.sessionId === hostSessionId);
  if (!host?.isHost) throw new Error("Only the host can kick players");
  if (state.phase !== "LOBBY") throw new Error("Players cannot be kicked during a match");
  if (playerId === host.id) throw new Error("The host cannot kick themselves");
  state.players = state.players.filter((p) => p.id !== playerId);
  state.version++; return state;
}

export function migrateHost(state: GameState, disconnectingPlayerId: string): boolean {
  const currentHost = state.players.find((p) => p.isHost);
  if (!currentHost || currentHost.id !== disconnectingPlayerId) return false;

  // Find most eligible new host: connected, alive, longest in room
  const eligible = state.players.filter((p) => p.id !== disconnectingPlayerId && p.connected);
  if (eligible.length === 0) return false;

  // Prefer alive players, fallback to any connected player
  const newHost = eligible.filter((p) => p.status === "ALIVE")[0] || eligible[0];
  if (!newHost) return false;

  currentHost.isHost = false;
  newHost.isHost = true;
  state.version++;
  return true;
}

export function handlePlayerDisconnect(state: GameState, playerId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return;

  player.connected = false;
  state.version++;

  // Migrate host in ALL phases, not just LOBBY
  migrateHost(state, playerId);
}

function assignRoles(state: GameState) {
  // Fisher-Yates shuffle for unbiased randomization
  const shuffled = [...state.players];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const imposters = shuffled.slice(0, state.config.imposters).map((p) => p.id);
  state.players.forEach((p) => {
    p.role = imposters.includes(p.id) ? "IMPOSTER" : "VILLAGER";
    p.status = "ALIVE";
    p.teamMates = state.config.mafiaMode === "CONNECTED" && p.role === "IMPOSTER"
      ? imposters.filter((id) => id !== p.id)
      : [];
  });
}

function chooseTask(playerId: string, round: number): TaskGame {
  return TASK_GAMES[(round - 1 + Math.abs(playerId.split("").reduce((a, c) => a + c.charCodeAt(0), 0))) % TASK_GAMES.length];
}

export function startMatch(state: GameState, hostSessionId: string) {
  const host = state.players.find((p) => p.sessionId === hostSessionId);
  if (!host?.isHost) throw new Error("Only the host can start");
  if (!["LOBBY", "GAME_OVER"].includes(state.phase)) throw new Error("A match is already in progress");
  if (state.players.length < 4) throw new Error("At least 4 players are required");
  if (state.players.filter((p) => p.connected).length < 4) throw new Error("At least 4 connected players are required");
  if (state.config.imposters >= Math.ceil(state.players.length / 2)) throw new Error("Choose fewer imposters for this player count");
  state.matchId = id("match"); state.matchNumber += 1; state.round = 0; state.winner = null;
  state.currentVictimId = undefined; state.eliminatedThisRound = undefined; state.lastEliminationRole = undefined;
  state.story = undefined; state.tasks = {}; state.votes = {}; state.tieCandidates = [];
  assignRoles(state); startCountdown(state); return state;
}

function startCountdown(state: GameState) {
  state.phase = "COUNTDOWN"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + 3000; state.version++;
}

export async function advancePhase(state: GameState) {
  const now = Date.now();
  if (!state.phaseEndsAt || now < state.phaseEndsAt) return false;
  switch (state.phase) {
    case "COUNTDOWN":
      state.phase = "ROLE_REVEAL"; state.phaseStartedAt = now; state.phaseEndsAt = now + 3500; state.version++; return true;
    case "ROLE_REVEAL": return startRound(state);
    case "ASSASSINATION": return await finishAssassination(state);
    case "DEATH_REVEAL": return startDiscussion(state);
    case "DISCUSSION": return startVoting(state);
    case "VOTING": return finishVoting(state);
    case "TIE_BREAK": return finishTieBreak(state);
    case "ELIMINATION_REVEAL": return finishEliminationReveal(state);
    case "ROUND_END": return continueOrFinish(state);
    default: return false;
  }
}

function startRound(state: GameState) {
  state.round += 1; state.phase = "ASSASSINATION"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + state.config.assassinationTime * 1000;
  state.currentVictimId = undefined; state.eliminatedThisRound = undefined; state.story = undefined; state.votes = {}; state.tieCandidates = [];
  state.tasks = {};
  const now = Date.now();
  for (const p of state.players.filter((p) => p.status === "ALIVE")) {
    const game = chooseTask(p.id, state.round);
    const answer = generateTaskAnswer(game, now);
    state.tasks[p.id] = { playerId: p.id, game, startedAt: now, completed: false, answer };
  }
  state.version++; return true;
}

export async function selectTarget(state: GameState, sessionId: string, targetId: string) {
  if (state.phase !== "ASSASSINATION") throw new Error("It is not assassination time");
  const actor = state.players.find((p) => p.sessionId === sessionId);
  const target = state.players.find((p) => p.id === targetId);
  if (!actor || actor.role !== "IMPOSTER" || actor.status !== "ALIVE") throw new Error("Only a living imposter can select a target");
  if (!target || target.status !== "ALIVE" || target.id === actor.id) throw new Error("Invalid target");
  if (state.currentVictimId && state.config.mafiaMode === "CONNECTED") throw new Error("A target is already selected");
  state.currentVictimId = target.id; target.timesTargeted += 1; state.version++;
  return state;
}

async function finishAssassination(state: GameState) {
  const victim = state.currentVictimId ? state.players.find((p) => p.id === state.currentVictimId) : undefined;
  if (victim) { victim.status = "DEAD"; state.eliminatedThisRound = victim.id; }
  state.story = undefined;

  // Build the story before starting the reveal clock. The previous flow started
  // the timer first, so an AI request could consume nearly the entire reveal.
  if (victim && state.config.storyEnabled) {
    const eligible = state.players.filter((p) => p.status === "ALIVE");
    const witness = eligible[Math.floor(Math.random() * Math.max(1, eligible.length))];
    const story = await generateStory({ victim: victim.name, witness: witness?.name ?? "A witness", allowedNames: state.players.map((p) => p.name), style: state.config.storyStyle });
    state.story = { id: story.id, victimId: victim.id, readerId: state.config.playMode === "IN_PERSON" ? witness?.id : undefined, text: story.text, style: state.config.storyStyle, ready: true };
  }

  const revealSeconds = victim ? STORY_REVEAL_SECONDS : 5;
  const revealStartedAt = Date.now();
  state.phase = "DEATH_REVEAL";
  state.phaseStartedAt = revealStartedAt;
  state.phaseEndsAt = revealStartedAt + revealSeconds * 1000;
  state.version++;
  return true;
}

function startDiscussion(state: GameState) {
  state.phase = "DISCUSSION"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + state.config.discussionTime * 1000; state.version++; return true;
}

function startVoting(state: GameState) {
  state.phase = "VOTING"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + state.config.votingTime * 1000; state.votes = {}; state.version++; return true;
}

export function castVote(state: GameState, sessionId: string, targetId: string | null) {
  if (!["VOTING", "TIE_BREAK"].includes(state.phase)) throw new Error("Voting is not active");
  const voter = state.players.find((p) => p.sessionId === sessionId);
  if (!voter || voter.status !== "ALIVE") throw new Error("Dead players cannot vote");
  if (targetId && !state.players.some((p) => p.id === targetId && p.status === "ALIVE")) throw new Error("Invalid vote target");
  if (state.votes[voter.id] && !state.config.allowVoteChange) throw new Error("Vote changes are disabled");
  state.votes[voter.id] = targetId; state.version++; return state;
}

function countVotes(state: GameState) {
  const counts: Record<string, number> = {};
  for (const p of state.players.filter((p) => p.status === "ALIVE")) counts[p.id] = 0;
  for (const vote of Object.values(state.votes)) if (vote && counts[vote] !== undefined) counts[vote]++;
  return counts;
}

function topCandidates(state: GameState) {
  const counts = countVotes(state); const max = Math.max(0, ...Object.values(counts));
  return Object.entries(counts).filter(([, count]) => count === max && max > 0).map(([id]) => id);
}

function finishVoting(state: GameState) {
  const top = topCandidates(state);
  if (top.length === 1) { eliminate(state, top[0]); return true; }
  if (top.length > 1 && state.config.tieBreakerEnabled) { state.tieCandidates = top; state.phase = "TIE_BREAK"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + state.config.votingTime * 1000; state.votes = {}; state.version++; return true; }
  state.eliminatedThisRound = undefined; state.phase = "ELIMINATION_REVEAL"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + 3500; state.version++; return true;
}

function finishTieBreak(state: GameState) {
  const top = topCandidates(state).filter((id) => state.tieCandidates.includes(id));
  if (top.length === 1) eliminate(state, top[0]);
  else { state.eliminatedThisRound = undefined; state.phase = "ELIMINATION_REVEAL"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + 3500; state.version++; }
  return true;
}

function eliminate(state: GameState, playerId: string) {
  const player = state.players.find((p) => p.id === playerId); if (!player) return;
  player.status = "DEAD"; state.eliminatedThisRound = player.id; state.lastEliminationRole = player.role; state.phase = "ELIMINATION_REVEAL"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + 3500; state.version++;
}

function finishEliminationReveal(state: GameState) {
  const impostersAlive = state.players.some((p) => p.status === "ALIVE" && p.role === "IMPOSTER");
  if (!impostersAlive) { state.winner = "VILLAGERS"; state.phase = "GAME_OVER"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = undefined; state.version++; return true; }
  if (state.round >= state.config.rounds) { state.winner = "IMPOSTERS"; state.phase = "GAME_OVER"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = undefined; state.version++; return true; }
  state.phase = "ROUND_END"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + 2500; state.version++; return true;
}

function continueOrFinish(state: GameState) { return startRound(state); }

export function completeTask(
  state: GameState,
  sessionId: string,
  clientAnswer: unknown,
  clientTiming: number
) {
  if (state.phase !== "ASSASSINATION") throw new Error("Task is not active");
  const player = state.players.find((p) => p.sessionId === sessionId);
  if (!player || player.status !== "ALIVE") throw new Error("You cannot complete this task");
  const task = state.tasks[player.id];
  if (!task) throw new Error("Task not found");
  if (task.completed) throw new Error("Task already completed");

  // Validate task completion
  const validation = validateTaskCompletion(task, clientAnswer, clientTiming);
  
  task.completed = true;
  task.completedAt = Date.now();
  task.score = Math.max(0, Math.min(100, Math.floor(validation.score)));
  task.accuracy = Math.max(0, Math.min(100, Math.floor(validation.accuracy)));
  state.version++;
  return state;
}

export async function tickRoom(roomId: string) {
  const state = await getGame(roomId); if (!state) return null;
  if (!state.phaseEndsAt || Date.now() < state.phaseEndsAt) return null;
  const advanced = await advancePhase(state);

  // Persist incrementally at key transitions
  if (advanced) {
    await saveGame(state);
    try {
      // Persist to database after each phase transition and at game end
      const shouldPersist = [
        "COUNTDOWN", "ROLE_REVEAL", "ASSASSINATION",
        "DEATH_REVEAL", "DISCUSSION", "VOTING",
        "TIE_BREAK", "ELIMINATION_REVEAL", "ROUND_END", "GAME_OVER"
      ].includes(state.phase);

      if (shouldPersist && (!state.dbPersistedAt || Date.now() - (state.dbPersistedAt ?? 0) > 5000)) {
        await persistMatch(state);
        state.dbPersistedAt = Date.now();
      }
    } catch (e) {
      // Persistence failure doesn't block game progression
      console.error("[DB Persist] Error:", e instanceof Error ? e.message : String(e));
    }
  }

  return advanced ? state : null;
}
