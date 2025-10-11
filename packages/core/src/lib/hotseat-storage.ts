/**
 * @fileoverview Hot-seat mode storage for managing player names and game state
 */

import type { EmojiGameState } from './emoji-game-schema';
import { EmojiGameStateSchema } from './emoji-game-schema';

const PLAYER1_NAME_KEY = 'correspondence-games:player1-name';
const PLAYER2_NAME_KEY = 'correspondence-games:player2-name';
const HOTSEAT_GAME_KEY = 'correspondence-games:hotseat-game';

/**
 * Manages hot-seat game storage with separate player names and game state.
 */
export class HotSeatStorage {
  /**
   * Sanitizes a string to prevent XSS attacks by encoding HTML entities.
   */
  private sanitize(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * Retrieves Player 1's name from localStorage.
   */
  getPlayer1Name(): string | null {
    return localStorage.getItem(PLAYER1_NAME_KEY);
  }

  /**
   * Stores Player 1's name in localStorage with sanitization.
   */
  setPlayer1Name(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player 1 name cannot be empty');
    }
    const sanitized = this.sanitize(name);
    localStorage.setItem(PLAYER1_NAME_KEY, sanitized);
  }

  /**
   * Retrieves Player 2's name from localStorage.
   */
  getPlayer2Name(): string | null {
    return localStorage.getItem(PLAYER2_NAME_KEY);
  }

  /**
   * Stores Player 2's name in localStorage with sanitization.
   */
  setPlayer2Name(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player 2 name cannot be empty');
    }
    const sanitized = this.sanitize(name);
    localStorage.setItem(PLAYER2_NAME_KEY, sanitized);
  }

  /**
   * Saves hot-seat game state to localStorage.
   */
  saveHotSeatGame(state: EmojiGameState): void {
    localStorage.setItem(HOTSEAT_GAME_KEY, JSON.stringify(state));
  }

  /**
   * Loads hot-seat game state from localStorage with Zod validation.
   */
  loadHotSeatGame(): EmojiGameState | null {
    const item = localStorage.getItem(HOTSEAT_GAME_KEY);
    if (!item) return null;

    try {
      const parsed = JSON.parse(item);
      return EmojiGameStateSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse hot-seat game:', error);
      localStorage.removeItem(HOTSEAT_GAME_KEY);
      return null;
    }
  }

  /**
   * Clears hot-seat game from localStorage.
   */
  clearHotSeatGame(): void {
    localStorage.removeItem(HOTSEAT_GAME_KEY);
  }
}
