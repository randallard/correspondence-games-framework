/**
 * Test helpers for creating game states with new schema
 */
import type { TicTacToeGameState, Board } from '../src/lib/tic-tac-toe-schema';

export function createTestGameState(overrides?: Partial<TicTacToeGameState>): TicTacToeGameState {
  return {
    gameId: crypto.randomUUID(),
    board: Array(9).fill(null) as Board,
    currentTurn: 0,
    currentPlayer: 1,
    player1: { id: crypto.randomUUID(), name: 'Alice' },
    player2: { id: crypto.randomUUID(), name: 'Bob' },
    status: 'playing',
    checksum: 'a'.repeat(64),
    ...overrides,
  };
}

export function createTestPlayerIds() {
  return {
    player1Id: crypto.randomUUID(),
    player2Id: crypto.randomUUID(),
  };
}
