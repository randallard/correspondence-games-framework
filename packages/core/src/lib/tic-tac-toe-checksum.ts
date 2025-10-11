import { calculateChecksum } from './checksum';
import type { TicTacToeGameState } from './tic-tac-toe-schema';

/**
 * Calculate SHA-256 checksum for Tic-Tac-Toe game state
 *
 * CRITICAL: Must be deterministic - same state = same checksum
 * Only includes game-critical data (no timestamps, UI state, etc.)
 *
 * @param state - Tic-Tac-Toe game state
 * @returns SHA-256 checksum as 64-character hex string
 */
export async function calculateBoardChecksum(state: TicTacToeGameState): Promise<string> {
  // Create canonical representation (deterministic JSON)
  const canonical = JSON.stringify({
    gameId: state.gameId,
    board: state.board,
    currentTurn: state.currentTurn,
    currentPlayer: state.currentPlayer,
    player1Name: state.player1Name,
    player2Name: state.player2Name,
    status: state.status,
  });

  // Reuse existing checksum implementation
  return calculateChecksum(canonical);
}
