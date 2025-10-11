import { describe, it, expect } from 'vitest';
import { encodeFullState, decodeFullState } from '../url-encoder';
import type { EmojiGameState } from '../emoji-game-schema';

describe('URL Encoder with Embedded Target Player', () => {
  const sampleState: EmojiGameState = {
    gameId: '123e4567-e89b-12d3-a456-426614174000',
    emojiChain: '🎮🎯',
    currentTurn: 2,
    currentPlayer: 2,
    player1Name: 'Alice',
    player2Name: 'Bob',
    checksum: 'abc123def456',
  };

  describe('encodeFullState', () => {
    it('should encode full state with targetPlayer=1', () => {
      const hash = encodeFullState(sampleState, 1);

      expect(hash).toMatch(/^#s=.+$/);
      expect(hash).not.toContain('&p='); // No visible player parameter
      expect(hash).not.toContain('targetPlayer'); // Not visible in URL
    });

    it('should encode full state with targetPlayer=2', () => {
      const hash = encodeFullState(sampleState, 2);

      expect(hash).toMatch(/^#s=.+$/);
      expect(hash).not.toContain('&p=');
      expect(hash).not.toContain('targetPlayer');
    });

    it('should produce different hashes for different target players', () => {
      const hash1 = encodeFullState(sampleState, 1);
      const hash2 = encodeFullState(sampleState, 2);

      // Different target players should produce different compressed payloads
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('decodeFullState', () => {
    it('should decode full state and extract targetPlayer=1', () => {
      const hash = encodeFullState(sampleState, 1);
      const { state, targetPlayer } = decodeFullState(hash);

      expect(state).toEqual(sampleState);
      expect(targetPlayer).toBe(1);
    });

    it('should decode full state and extract targetPlayer=2', () => {
      const hash = encodeFullState(sampleState, 2);
      const { state, targetPlayer } = decodeFullState(hash);

      expect(state).toEqual(sampleState);
      expect(targetPlayer).toBe(2);
    });

    it('should throw error for invalid hash format', () => {
      expect(() => decodeFullState('#s=invalid')).toThrow();
    });

    it('should throw error for malformed payload', () => {
      expect(() => decodeFullState('#s=AAAAinvalid')).toThrow();
    });
  });

  describe('backward compatibility', () => {
    it('should handle old URLs without targetPlayer by inferring from currentPlayer', () => {
      // Manually create an old-format URL (state only, no targetPlayer wrapper)
      const oldFormatJson = JSON.stringify(sampleState);
      const LZString = require('lz-string');
      const compressed = LZString.compressToEncodedURIComponent(oldFormatJson);
      const oldHash = `#s=${compressed}`;

      const { state, targetPlayer } = decodeFullState(oldHash);

      expect(state).toEqual(sampleState);
      // Should infer targetPlayer from state.currentPlayer
      expect(targetPlayer).toBe(sampleState.currentPlayer);
    });
  });

  describe('round-trip encoding', () => {
    it('should maintain state integrity through encode-decode cycle for player 1', () => {
      const hash = encodeFullState(sampleState, 1);
      const { state, targetPlayer } = decodeFullState(hash);

      expect(state).toEqual(sampleState);
      expect(targetPlayer).toBe(1);
    });

    it('should maintain state integrity through encode-decode cycle for player 2', () => {
      const hash = encodeFullState(sampleState, 2);
      const { state, targetPlayer } = decodeFullState(hash);

      expect(state).toEqual(sampleState);
      expect(targetPlayer).toBe(2);
    });
  });
});
