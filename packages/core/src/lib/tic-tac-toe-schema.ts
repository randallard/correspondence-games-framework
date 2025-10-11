import { z } from 'zod';

// Cell can be null (empty), 'X' (player 1), or 'O' (player 2)
export const CellSchema = z.union([z.null(), z.literal('X'), z.literal('O')]);
export type Cell = z.infer<typeof CellSchema>;

// Board is array of 9 cells (indices 0-8)
// Layout:
//   0 | 1 | 2
//  ---+---+---
//   3 | 4 | 5
//  ---+---+---
//   6 | 7 | 8
export const BoardSchema = z.array(CellSchema).length(9);
export type Board = z.infer<typeof BoardSchema>;

export const GameStatusSchema = z.enum([
  'playing',
  'player1_wins',
  'player2_wins',
  'draw'
]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const TicTacToeGameStateSchema = z.object({
  gameId: z.string().uuid(),
  board: BoardSchema,
  currentTurn: z.number().int().min(0).max(9), // 0 = game start, 9 = board full
  currentPlayer: z.union([z.literal(1), z.literal(2)]),
  player1Name: z.string(),
  player2Name: z.string(), // Empty string until Player 2 joins
  status: GameStatusSchema,
  checksum: z.string().length(64), // SHA-256 hex
});
export type TicTacToeGameState = z.infer<typeof TicTacToeGameStateSchema>;

/**
 * Create empty board (9 nulls)
 */
export function createEmptyBoard(): Board {
  return Array(9).fill(null) as Board;
}

/**
 * Create new game state with empty board
 */
export function createNewTicTacToeGame(gameId: string): TicTacToeGameState {
  return {
    gameId,
    board: createEmptyBoard(),
    currentTurn: 0,
    currentPlayer: 1,
    player1Name: '',
    player2Name: '',
    status: 'playing',
    checksum: '', // Will be calculated after creation
  };
}
