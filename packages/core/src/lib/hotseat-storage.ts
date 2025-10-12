/**
 * @fileoverview Hot-seat mode storage for managing player names and game state
 */

import type { EmojiGameState } from './emoji-game-schema';
import { EmojiGameStateSchema } from './emoji-game-schema';

const PLAYER1_NAME_KEY = 'correspondence-games:player1-name';
const PLAYER2_NAME_KEY = 'correspondence-games:player2-name';
const HOTSEAT_GAME_KEY = 'correspondence-games:hotseat-game';
const MY_PLAYER_ID_KEY = 'correspondence-games:my-player-id';
const MY_NAME_KEY = 'correspondence-games:my-name';

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

  /**
   * Retrieves the persistent player ID for this browser.
   * If no ID exists, generates and stores a new one.
   */
  getMyPlayerId(): string {
    let id = localStorage.getItem(MY_PLAYER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(MY_PLAYER_ID_KEY, id);
    }
    return id;
  }

  /**
   * Stores the persistent player ID (rarely needed - usually auto-generated).
   */
  setMyPlayerId(id: string): void {
    if (!id || id.trim().length === 0) {
      throw new Error('Player ID cannot be empty');
    }
    localStorage.setItem(MY_PLAYER_ID_KEY, id);
  }

  /**
   * Retrieves "my name" - used in URL mode regardless of player role.
   * Falls back to player1Name or player2Name for migration.
   */
  getMyName(): string | null {
    // Check new format first
    const myName = localStorage.getItem(MY_NAME_KEY);
    if (myName) return myName;

    // Migration: check old format
    const player1Name = this.getPlayer1Name();
    const player2Name = this.getPlayer2Name();

    // Use whichever is set
    if (player1Name) {
      this.setMyName(player1Name);
      return player1Name;
    }
    if (player2Name) {
      this.setMyName(player2Name);
      return player2Name;
    }

    return null;
  }

  /**
   * Stores "my name" - used in URL mode regardless of player role.
   */
  setMyName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Name cannot be empty');
    }
    const sanitized = this.sanitize(name);
    localStorage.setItem(MY_NAME_KEY, sanitized);
  }
}
