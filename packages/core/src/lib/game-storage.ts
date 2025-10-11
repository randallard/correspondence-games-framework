/**
 * @fileoverview Game state storage for localStorage with automatic cleanup
 */

import type { EmojiGameState } from './emoji-game-schema';
import { EmojiGameStateSchema } from './emoji-game-schema';

const STORAGE_PREFIX = 'correspondence-games:game:';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredGameState extends EmojiGameState {
  timestamp: number;
}

/**
 * Manages game state persistence in localStorage with validation and cleanup.
 */
export class GameStorage {
  /**
   * Saves game state to localStorage with timestamp for cleanup.
   * Automatically runs cleanup if quota is exceeded.
   *
   * @param state - The game state to store
   * @throws {Error} If localStorage quota is exceeded even after cleanup
   */
  saveGameState(state: EmojiGameState): void {
    const key = `${STORAGE_PREFIX}${state.gameId}`;
    const stored: StoredGameState = {
      ...state,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, cleaning up old games');
        this.cleanupOldGames();
        // Try again after cleanup
        try {
          localStorage.setItem(key, JSON.stringify(stored));
        } catch (retryError) {
          console.error('Failed to save game state even after cleanup:', retryError);
          throw new Error('Cannot save game state: localStorage quota exceeded');
        }
      } else {
        throw error;
      }
    }
  }

  /**
   * Retrieves game state from localStorage by gameId.
   * Validates retrieved data with Zod schema.
   *
   * @param gameId - The UUID of the game to retrieve
   * @returns The game state if found and valid, null otherwise
   */
  getGameState(gameId: string): EmojiGameState | null {
    const key = `${STORAGE_PREFIX}${gameId}`;
    const item = localStorage.getItem(key);

    if (!item) return null;

    try {
      const stored: StoredGameState = JSON.parse(item);
      const { timestamp, ...state } = stored;

      // Validate with Zod
      return EmojiGameStateSchema.parse(state);
    } catch (error) {
      console.error('Failed to parse stored game state:', error);
      // Clean up corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  /**
   * Removes game states older than 30 days and corrupted data from localStorage.
   * Should be called periodically or when quota is exceeded.
   */
  cleanupOldGames(): void {
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Iterate through all localStorage keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue;

      const item = localStorage.getItem(key);
      if (!item) continue;

      try {
        const stored: StoredGameState = JSON.parse(item);
        if (now - stored.timestamp > MAX_AGE_MS) {
          keysToRemove.push(key);
        }
      } catch (error) {
        // Corrupted data - mark for removal
        keysToRemove.push(key);
      }
    }

    // Remove old games
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  }
}
