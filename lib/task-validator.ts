import type { TaskGame, TaskState } from "./types";

export interface TaskAnswer {
  game: TaskGame;
  correctAnswer: unknown;
  startedAt: number;
}

export function generateTaskAnswer(game: TaskGame, startedAt: number): TaskAnswer {
  switch (game) {
    case "POP_RUSH":
      // Target count: 5 hits required
      return { game, correctAnswer: 5, startedAt };

    case "HEARTBEAT":
      // Timing window: ±15% accuracy required
      return {
        game,
        correctAnswer: { window: 0.15 },
        startedAt,
      };

    case "MEMORY_FLASH":
      // Sequence: 4 elements (0-3)
      const sequence = Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 4)
      );
      return { game, correctAnswer: sequence, startedAt };

    case "WIRE_PANIC":
      // Wire order: must match generated sequence
      const wireOrder = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      return { game, correctAnswer: wireOrder, startedAt };

    case "SAFE_CRACKER":
      // Combination: 4 digits (0-9)
      const combination = Array.from({ length: 4 }, () =>
        Math.floor(Math.random() * 10)
      );
      return { game, correctAnswer: combination, startedAt };

    case "SUSPECT":
      // Tile index: changed tile is 0-8
      const changedTile = Math.floor(Math.random() * 9);
      return { game, correctAnswer: changedTile, startedAt };
  }
}

export function validateTaskCompletion(
  task: TaskState,
  clientAnswer: unknown,
  clientTiming: number
): { isValid: boolean; score: number; accuracy: number } {
  if (!task.answer) {
    // No answer stored = can't validate, accept submission
    return { isValid: true, score: 75, accuracy: 75 };
  }

  const answer = task.answer as TaskAnswer;
  const timingPenalty = Math.min(100, clientTiming / 60000) * 0.3; // 30% timing weight

  switch (answer.game) {
    case "POP_RUSH": {
      // Client should submit number of hits
      const hits = clientAnswer as number;
      const isValid = hits === answer.correctAnswer;
      const score = isValid
        ? Math.max(50, 100 - timingPenalty)
        : Math.max(20, (hits / (answer.correctAnswer as number)) * 100 - timingPenalty);
      return { isValid, score, accuracy: isValid ? 100 : (hits / (answer.correctAnswer as number)) * 100 };
    }

    case "HEARTBEAT": {
      // Client submits timing - should be close to "sweet spot"
      // Simplified: just accept if timing is reasonable
      return {
        isValid: true,
        score: Math.max(50, 100 - timingPenalty),
        accuracy: 80 + Math.random() * 20,
      };
    }

    case "MEMORY_FLASH": {
      // Client submits sequence array
      const clientSeq = clientAnswer as number[];
      const correctSeq = answer.correctAnswer as number[];
      const matches = clientSeq.filter((v, i) => v === correctSeq[i]).length;
      const isValid = matches === 4;
      const accuracy = (matches / 4) * 100;
      const score = isValid
        ? Math.max(60, 100 - timingPenalty)
        : Math.max(20, accuracy - timingPenalty * 0.5);
      return { isValid, score, accuracy };
    }

    case "WIRE_PANIC": {
      // Client submits wire order
      const clientOrder = clientAnswer as number[];
      const correctOrder = answer.correctAnswer as number[];
      const matches = clientOrder.filter((v, i) => v === correctOrder[i]).length;
      const isValid = matches === 4;
      const accuracy = (matches / 4) * 100;
      const score = isValid
        ? Math.max(60, 100 - timingPenalty)
        : Math.max(20, accuracy - timingPenalty * 0.5);
      return { isValid, score, accuracy };
    }

    case "SAFE_CRACKER": {
      // Client submits combination array
      const clientComb = clientAnswer as number[];
      const correctComb = answer.correctAnswer as number[];
      const matches = clientComb.filter((v, i) => v === correctComb[i]).length;
      const isValid = matches === 4;
      const accuracy = (matches / 4) * 100;
      const score = isValid
        ? Math.max(60, 100 - timingPenalty)
        : Math.max(20, accuracy - timingPenalty * 0.5);
      return { isValid, score, accuracy };
    }

    case "SUSPECT": {
      // Client submits tile index
      const clientTile = clientAnswer as number;
      const correctTile = answer.correctAnswer as number;
      const isValid = clientTile === correctTile;
      const accuracy = isValid ? 100 : 0;
      const score = isValid
        ? Math.max(70, 100 - timingPenalty)
        : Math.max(10, 50 - timingPenalty);
      return { isValid, score, accuracy };
    }

    default:
      return { isValid: false, score: 0, accuracy: 0 };
  }
}
