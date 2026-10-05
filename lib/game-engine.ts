import { randomInt } from "node:crypto";
import { DEFAULT_CONFIG, TASK_GAMES } from "./constants";
import { getGame, saveGame } from "./game-store";
import { id, roomCode } from "./id";
import { generateStory } from "./story";
import { persistMatch } from "./persistence";
import type { GameState, MatchConfig, Player, Role, TaskGame } from "./types";

export function validateConfig(config: Partial<MatchConfig>): MatchConfig {
  const merged = { ...DEFAULT_CONFIG, ...config };
  merged.maxPlayers = Math.min(25, Math.max(4, Number(merged.maxPlayers) || DEFAULT_CONFIG.maxPlayers));
  merged.rounds = Math.min(8, Math.max(1, Number(merged.rounds) || 4));
  merged.imposters = Math.min(3, Math.max(1, Number(merged.imposters) || 1));
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

function assignRoles(state: GameState) {
  const shuffled = [...state.players].sort(() => randomInt(0, 2) - 1);
  // Soft fairness: recently surviving Mafia are not hard-blocked, but random shuffle remains authoritative.
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
  if (state.players.length < 4) throw new Error("At least 4 players are required");
  if (state.players.filter((p) => p.connected).length < 4) throw new Error("At least 4 connected players are required");
  if (state.config.imposters >= Math.ceil(state.players.length / 2)) throw new Error("Choose fewer imposters for this player count");
  state.matchId = id("match"); state.matchNumber += 1; state.round = 0; state.winner = null; state.eliminatedThisRound = undefined; state.lastEliminationRole = undefined;
  assignRoles(state); startCountdown(state); return state;
}

function startCountdown(state: GameState) {
  state.phase = "COUNTDOWN"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + 3000; state.version++;
}

export function advancePhase(state: GameState) {
  const now = Date.now();
  if (!state.phaseEndsAt || now < state.phaseEndsAt) return false;
  switch (state.phase) {
    case "COUNTDOWN":
      state.phase = "ROLE_REVEAL"; state.phaseStartedAt = now; state.phaseEndsAt = now + 3500; state.version++; return true;
    case "ROLE_REVEAL": return startRound(state);
    case "ASSASSINATION": return finishAssassination(state);
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
  state.currentVictimId = undefined; state.eliminatedThisRound = undefined; state.votes = {}; state.tieCandidates = [];
  state.tasks = {};
  for (const p of state.players.filter((p) => p.status === "ALIVE")) state.tasks[p.id] = { playerId: p.id, game: chooseTask(p.id, state.round), startedAt: Date.now(), completed: false };
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
  state.phase = "DEATH_REVEAL"; state.phaseStartedAt = Date.now(); state.phaseEndsAt = Date.now() + 5000;
  state.version++;
  if (victim && state.config.storyEnabled) {
    const eligible = state.players.filter((p) => p.status === "ALIVE" && p.role !== "IMPOSTER");
    const witness = eligible[Math.floor(Math.random() * Math.max(1, eligible.length))];
    const story = await generateStory({ victim: victim.name, witness: witness?.name ?? "A witness", allowedNames: state.players.map((p) => p.name), style: state.config.storyStyle });
    state.story = { id: story.id, victimId: victim.id, readerId: state.config.playMode === "IN_PERSON" ? witness?.id : undefined, text: story.text, style: state.config.storyStyle, ready: true };
    state.version++;
  }
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

export function completeTask(state: GameState, sessionId: string, score: number, accuracy: number) {
  if (state.phase !== "ASSASSINATION") throw new Error("Task is not active");
  const player = state.players.find((p) => p.sessionId === sessionId); if (!player || player.status !== "ALIVE") throw new Error("You cannot complete this task");
  const task = state.tasks[player.id]; if (!task) throw new Error("Task not found");
  if (task.completed) throw new Error("Task already completed");
  task.completed = true; task.completedAt = Date.now(); task.score = Math.max(0, Math.min(100, score)); task.accuracy = Math.max(0, Math.min(100, accuracy)); state.version++; return state;
}

export async function tickRoom(roomId: string) {
  const state = await getGame(roomId); if (!state) return null;
  if (!state.phaseEndsAt || Date.now() < state.phaseEndsAt) return state;
  await advancePhase(state);
  if (state.phase === "GAME_OVER" && !state.dbPersistedAt) { try { await persistMatch(state); state.dbPersistedAt = Date.now(); } catch {} }
  await saveGame(state); return state;
}
