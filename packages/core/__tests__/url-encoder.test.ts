import { describe, it, expect } from 'vitest';
import { encodeFullState, decodeFullState } from '../src/lib/url-encoder';
import type { EmojiGameState } from '../src/lib/emoji-game-schema';

describe('encodeFullState', () => {
  it('should encode emoji game state to hash fragment', () => {
    const state: EmojiGameState = {
      gameId: 'test-123',
      emojiChain: '🎮',
      currentTurn: 1,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: 'Bob',
      checksum: 'abc123',
    };

    const hashFragment = encodeFullState(state, 2);

    expect(hashFragment).toMatch(/^#s=/); // Hash fragment, not query string!
    expect(hashFragment.length).toBeLessThan(2000);
  });

  it('should produce valid compressed hash fragment', () => {
    const state: EmojiGameState = {
      gameId: 'test-123',
      emojiChain: '🎮🎯🎲🎪🎨',
      currentTurn: 5,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: 'Bob',
      checksum: 'abc123',
    };

    const hashFragment = encodeFullState(state, 2);

    // Should be a hash fragment
    expect(hashFragment).toMatch(/^#s=/);
    // Should be URL-safe (no spaces, proper encoding)
    expect(hashFragment).not.toContain(' ');
    // Should stay under URL length limit
    expect(hashFragment.length).toBeLessThan(2000);
  });
});

describe('decodeFullState', () => {
  it('should throw error on invalid hash fragment', () => {
    const invalidHash = '#s=invalid!!!';

    expect(() => decodeFullState(invalidHash)).toThrow('Failed to decompress hash fragment');
  });

  it('should round-trip emoji state through encoding and decoding', () => {
    const original: EmojiGameState = {
      gameId: crypto.randomUUID(),
      emojiChain: '🎮🎯🎲',
      currentTurn: 3,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      checksum: 'xyz789',
    };

    const encoded = encodeFullState(original, 1);
    const { state: decoded, targetPlayer } = decodeFullState(encoded);

    expect(decoded).toEqual(original);
    expect(targetPlayer).toBe(1);
  });
});
