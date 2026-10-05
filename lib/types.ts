export type PlayMode = "IN_PERSON" | "REMOTE";
export type MafiaMode = "BLIND" | "CONNECTED";
export type Phase =
  | "LOBBY"
  | "COUNTDOWN"
  | "ROLE_REVEAL"
  | "ASSASSINATION"
  | "DEATH_REVEAL"
  | "DISCUSSION"
  | "VOTING"
  | "TIE_BREAK"
  | "ELIMINATION_REVEAL"
  | "ROUND_END"
  | "GAME_OVER";
export type Role = "VILLAGER" | "IMPOSTER";
export type PlayerStatus = "ALIVE" | "DEAD" | "LEFT";
export type Winner = "VILLAGERS" | "IMPOSTERS" | null;
export type TaskGame = "POP_RUSH" | "HEARTBEAT" | "MEMORY_FLASH" | "WIRE_PANIC" | "SAFE_CRACKER" | "SUSPECT";

export interface MatchConfig {
  maxPlayers: number;
  imposters: number;
  mafiaMode: MafiaMode;
  playMode: PlayMode;
  rounds: number;
  assassinationTime: number;
  taskTime: number;
  discussionTime: number;
  votingTime: number;
  votesPerPlayer: number;
  allowVoteChange: boolean;
  tieBreakerEnabled: boolean;
  failedKillBehavior: "NO_KILL" | "RANDOM";
  storyEnabled: boolean;
  storyStyle: "MYSTERY" | "CINEMATIC" | "FUNNY" | "CREEPY";
}

export interface Player {
  id: string;
  sessionId: string;
  name: string;
  avatarId: string;
  isHost: boolean;
  connected: boolean;
  status: PlayerStatus;
  role?: Role;
  teamMates?: string[];
  roundsSurvived: number;
  timesTargeted: number;
}

export interface TaskState {
  playerId: string;
  game: TaskGame;
  startedAt: number;
  completedAt?: number;
  score?: number;
  accuracy?: number;
  completed: boolean;
}

export interface StoryState {
  id: string;
  victimId: string;
  readerId?: string;
  text: string;
  style: MatchConfig["storyStyle"];
  ready: boolean;
}

export interface GameState {
  version: number;
  roomCode: string;
  roomId: string;
  matchId: string;
  matchNumber: number;
  phase: Phase;
  round: number;
  config: MatchConfig;
  players: Player[];
  phaseStartedAt?: number;
  phaseEndsAt?: number;
  currentVictimId?: string;
  eliminatedThisRound?: string;
  votes: Record<string, string | null>;
  tieCandidates: string[];
  tasks: Record<string, TaskState>;
  story?: StoryState;
  winner: Winner;
  lastEliminationRole?: Role;
  message?: string;
  dbPersistedAt?: number;
}

export interface PublicPlayer extends Omit<Player, "sessionId" | "role" | "teamMates"> {
  role?: Role;
  teamMates?: string[];
}

export interface ClientSnapshot extends Omit<GameState, "players"> {
  players: PublicPlayer[];
  me: PublicPlayer | null;
  serverNow: number;
}

export interface SessionRecord {
  sessionId: string;
  playerId: string;
  roomId: string;
  roomCode: string;
  createdAt: number;
  expiresAt: number;
}
