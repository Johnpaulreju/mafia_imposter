import type { MatchConfig, TaskGame } from "./types";

export const DEFAULT_CONFIG: MatchConfig = {
  maxPlayers: 12,
  imposters: 1,
  mafiaMode: "CONNECTED",
  playMode: "IN_PERSON",
  rounds: 4,
  assassinationTime: 20,
  taskTime: 20,
  discussionTime: 20,
  votingTime: 30,
  votesPerPlayer: 1,
  allowVoteChange: true,
  tieBreakerEnabled: true,
  failedKillBehavior: "NO_KILL",
  storyEnabled: true,
  storyStyle: "MYSTERY",
};

// The discovery is intentionally a short, separate beat before discussion.
// This gives the narrator enough time to read without stealing debate time.
export const STORY_REVEAL_SECONDS = 10;

export const TASK_GAMES: TaskGame[] = [
  "POP_RUSH",
  "HEARTBEAT",
  "MEMORY_FLASH",
  "WIRE_PANIC",
  "SAFE_CRACKER",
  "SUSPECT",
];

export const AVATARS = [
  "fox", "owl", "cat", "raven", "wolf", "bear", "deer", "snake", "rabbit", "tiger", "panda", "crow",
];

export const STORY_LOCATIONS = [
  "an old shop",
  "an empty cinema",
  "a rainy street",
  "a quiet library",
  "a hotel corridor",
  "an abandoned train station",
  "a village festival",
  "a dark power-outage hallway",
];
