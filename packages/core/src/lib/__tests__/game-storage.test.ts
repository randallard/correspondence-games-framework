import { describe, it, expect, beforeEach } from 'vitest';
import { GameStorage } from '../game-storage';
import type { EmojiGameState } from '../emoji-game-schema';

describe('GameStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('saveGameState and getGameState', () => {
    it('should store and retrieve game state', () => {
      const storage = new GameStorage();
      const state: EmojiGameState = {
        gameId: crypto.randomUUID(),
        emojiChain: '🎮🎯',
        currentTurn: 2,
        currentPlayer: 2,
        player1Name: 'Alice',
        player2Name: 'Bob',
        checksum: 'abc123',
      };

      storage.saveGameState(state);
      const retrieved = storage.getGameState(state.gameId);

      expect(retrieved).toEqual(state);
    });

    it('should return null for non-existent game', () => {
      const storage = new GameStorage();
      const retrieved = storage.getGameState('non-existent-game-id');

      expect(retrieved).toBeNull();
    });
  });

  describe('cleanupOldGames', () => {
    it('should clean up games older than 30 days', () => {
      const storage = new GameStorage();

      // Create old game (31 days ago)
      const oldState: EmojiGameState = {
        gameId: crypto.randomUUID(),
        emojiChain: '🎮',
        currentTurn: 1,
        currentPlayer: 1,
        player1Name: 'Alice',
        player2Name: 'Bob',
        checksum: 'old-checksum',
      };
      const oldTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000);
      localStorage.setItem(
        `correspondence-games:game:${oldState.gameId}`,
        JSON.stringify({ ...oldState, timestamp: oldTimestamp })
      );

      // Create recent game (1 day ago)
      const recentState: EmojiGameState = {
        gameId: crypto.randomUUID(),
        emojiChain: '🎯',
        currentTurn: 1,
        currentPlayer: 1,
        player1Name: 'Charlie',
        player2Name: 'Diana',
        checksum: 'recent-checksum',
      };
      storage.saveGameState(recentState);

      storage.cleanupOldGames();

      expect(storage.getGameState(oldState.gameId)).toBeNull();
      expect(storage.getGameState(recentState.gameId)).toEqual(recentState);
    });

    it('should handle corrupted data during cleanup', () => {
      const storage = new GameStorage();

      // Add corrupted data
      localStorage.setItem('correspondence-games:game:corrupted-id', 'invalid-json{{{');

      // Should not throw
      expect(() => storage.cleanupOldGames()).not.toThrow();

      // Corrupted data should be removed
      expect(localStorage.getItem('correspondence-games:game:corrupted-id')).toBeNull();
    });
  });
});
