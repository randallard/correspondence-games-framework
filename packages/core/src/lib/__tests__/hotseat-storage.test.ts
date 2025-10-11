import { describe, it, expect, beforeEach } from 'vitest';
import { HotSeatStorage } from '../hotseat-storage';
import type { EmojiGameState } from '../emoji-game-schema';

describe('HotSeatStorage', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('player names', () => {
    it('should store player 1 and player 2 names separately', () => {
      const storage = new HotSeatStorage();

      storage.setPlayer1Name('Alice');
      storage.setPlayer2Name('Bob');

      expect(storage.getPlayer1Name()).toBe('Alice');
      expect(storage.getPlayer2Name()).toBe('Bob');
    });

    it('should return null for unset player names', () => {
      const storage = new HotSeatStorage();

      expect(storage.getPlayer1Name()).toBeNull();
      expect(storage.getPlayer2Name()).toBeNull();
    });

    it('should sanitize player names to prevent XSS', () => {
      const storage = new HotSeatStorage();

      storage.setPlayer1Name('<script>alert("xss")</script>');
      const sanitized = storage.getPlayer1Name();

      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });
  });

  describe('game state', () => {
    it('should save and load hot-seat game state', () => {
      const storage = new HotSeatStorage();
      const state: EmojiGameState = {
        gameId: crypto.randomUUID(),
        emojiChain: '🎮🎯',
        currentTurn: 2,
        currentPlayer: 1,
        player1Name: 'Alice',
        player2Name: 'Bob',
        checksum: 'abc123',
      };

      storage.saveHotSeatGame(state);
      const loaded = storage.loadHotSeatGame();

      expect(loaded).toEqual(state);
    });

    it('should return null when no game is saved', () => {
      const storage = new HotSeatStorage();

      expect(storage.loadHotSeatGame()).toBeNull();
    });

    it('should clear hot-seat game', () => {
      const storage = new HotSeatStorage();
      const state: EmojiGameState = {
        gameId: crypto.randomUUID(),
        emojiChain: '🎮',
        currentTurn: 1,
        currentPlayer: 1,
        player1Name: 'Alice',
        player2Name: 'Bob',
        checksum: 'abc123',
      };

      storage.saveHotSeatGame(state);
      storage.clearHotSeatGame();

      expect(storage.loadHotSeatGame()).toBeNull();
    });
  });
});
