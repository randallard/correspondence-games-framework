import { TicTacToeGameStateSchema, type TicTacToeGameState } from './tic-tac-toe-schema';

const GAME_STATE_KEY = 'correspondence-games:tic-tac-toe-state';

/**
 * Storage manager for Tic-Tac-Toe game state
 * Handles localStorage persistence with Zod validation
 */
export class TicTacToeStorage {
  /**
   * Save game state to localStorage
   * @param state - Game state to save
   */
  saveGameState(state: TicTacToeGameState): void {
    try {
      localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save Tic-Tac-Toe game state:', error);
    }
  }

  /**
   * Load game state from localStorage
   * @returns Game state or null if not found/invalid
   */
  loadGameState(): TicTacToeGameState | null {
    try {
      const item = localStorage.getItem(GAME_STATE_KEY);
      if (!item) return null;

      const parsed = JSON.parse(item);
      return TicTacToeGameStateSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to load Tic-Tac-Toe game state:', error);
      // Clear invalid data
      this.clearGameState();
      return null;
    }
  }

  /**
   * Clear game state from localStorage
   */
  clearGameState(): void {
    try {
      localStorage.removeItem(GAME_STATE_KEY);
    } catch (error) {
      console.error('Failed to clear Tic-Tac-Toe game state:', error);
    }
  }
}
