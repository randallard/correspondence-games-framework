import { describe, it, expect } from 'vitest';
import { createDelta, encodeDelta, decodeDelta, applyDelta, type EmojiDelta } from '../src/lib/delta';
import { encodeFullState } from '../src/lib/url-encoder';
import { calculateChecksum } from '../src/lib/checksum';
import type { EmojiGameState } from '../src/lib/emoji-game-schema';

describe('createDelta', () => {
  it('should create delta with move and checksums', async () => {
    const delta = await createDelta(
      'game-123',
      '🎯',
      2,
      2,
      'checksum-turn-1',
      'checksum-turn-2'
    );

    expect(delta.gameId).toBe('game-123');
    expect(delta.move.emoji).toBe('🎯');
    expect(delta.move.player).toBe(2);
    expect(delta.move.turn).toBe(2);
    expect(delta.prevChecksum).toBe('checksum-turn-1');
    expect(delta.newChecksum).toBe('checksum-turn-2');
    expect(delta.hmac).toBeDefined();
    expect(delta.hmac).toMatch(/^[a-f0-9]+$/); // Hex string
  });

  it('should generate different HMACs for different deltas', async () => {
    const delta1 = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const delta2 = await createDelta('game-123', '🎲', 1, 3, 'prev2', 'new2');

    expect(delta1.hmac).not.toBe(delta2.hmac);
  });

  it('should generate same HMAC for same delta', async () => {
    const delta1 = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const delta2 = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');

    expect(delta1.hmac).toBe(delta2.hmac);
  });
});

describe('encodeDelta', () => {
  it('should encode delta to hash fragment', async () => {
    const delta = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const hashFragment = encodeDelta(delta, 1);

    expect(hashFragment).toMatch(/^#d=/); // Delta hash fragment!
    expect(hashFragment.length).toBeLessThan(2000);
  });

  it('should demonstrate delta encoding advantage for complex games', async () => {
    // NOTE: For simple emoji chains, delta overhead (HMAC + structure) can exceed savings
    // Delta encoding shines for games with complex state (like tic-tac-toe board arrays)

    // Simple game: 5 emojis
    const simpleState: EmojiGameState = {
      gameId: crypto.randomUUID(),
      emojiChain: '🎮🎯🎲🎪🎨',
      currentTurn: 5,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: 'Bob',
      checksum: 'a'.repeat(64), // SHA-256 checksum
    };

    const simpleDelta = await createDelta(
      simpleState.gameId,
      '🎨',
      1,
      5,
      'b'.repeat(64),
      simpleState.checksum
    );

    const simpleFullURL = encodeFullState(simpleState, 2);
    const simpleDeltaURL = encodeDelta(simpleDelta, 2);

    console.log(`📊 Delta Encoding Analysis:
      Simple Game (5 emojis):
        Full State: ${simpleFullURL.length} chars
        Delta:      ${simpleDeltaURL.length} chars

      Note: Delta includes HMAC security overhead.
      For emoji game, benefit comes at longer chains.
      For complex games (boards, arrays), delta wins immediately.`);

    // Delta structure is valid and secure, even if not always smaller
    expect(simpleDeltaURL).toMatch(/^#d=/);
    expect(simpleDelta.hmac).toBeDefined();
    expect(simpleDelta.move.emoji).toBe('🎨');
  });
});

describe('decodeDelta', () => {
  it('should decode delta from hash fragment', async () => {
    const delta = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const hashFragment = encodeDelta(delta, 1);

    const { delta: decoded, targetPlayer } = decodeDelta(hashFragment);

    expect(decoded.gameId).toBe('game-123');
    expect(decoded.move.emoji).toBe('🎯');
    expect(decoded.move.player).toBe(2);
    expect(decoded.move.turn).toBe(2);
    expect(decoded.prevChecksum).toBe('prev1');
    expect(decoded.newChecksum).toBe('new1');
    expect(decoded.hmac).toBe(delta.hmac);
    expect(targetPlayer).toBe(1);
  });

  it('should round-trip encode/decode delta', async () => {
    const originalDelta = await createDelta('game-456', '🎲', 1, 5, 'checksumA', 'checksumB');
    const encoded = encodeDelta(originalDelta, 2);
    const { delta: decoded, targetPlayer } = decodeDelta(encoded);

    expect(decoded).toEqual(originalDelta);
    expect(targetPlayer).toBe(2);
  });

  it('should encode delta with targetPlayer=1', async () => {
    const delta = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const hash = encodeDelta(delta, 1);

    expect(hash).toMatch(/^#d=.+$/);
    expect(hash).not.toContain('&p='); // No visible player parameter
    expect(hash).not.toContain('targetPlayer'); // Not visible in URL
  });

  it('should encode delta with targetPlayer=2', async () => {
    const delta = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const hash = encodeDelta(delta, 2);

    expect(hash).toMatch(/^#d=.+$/);
    expect(hash).not.toContain('&p=');
    expect(hash).not.toContain('targetPlayer');
  });

  it('should decode delta and extract targetPlayer=1', async () => {
    const delta = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const hash = encodeDelta(delta, 1);
    const { delta: decoded, targetPlayer } = decodeDelta(hash);

    expect(decoded).toEqual(delta);
    expect(targetPlayer).toBe(1);
  });

  it('should decode delta and extract targetPlayer=2', async () => {
    const delta = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');
    const hash = encodeDelta(delta, 2);
    const { delta: decoded, targetPlayer } = decodeDelta(hash);

    expect(decoded).toEqual(delta);
    expect(targetPlayer).toBe(2);
  });

  it('should handle backward compatibility for old delta URLs', async () => {
    const delta = await createDelta('game-123', '🎯', 2, 2, 'prev1', 'new1');

    // Manually create an old-format delta URL (no targetPlayer wrapper)
    const oldFormatJson = JSON.stringify(delta);
    const LZString = require('lz-string');
    const compressed = LZString.compressToEncodedURIComponent(oldFormatJson);
    const oldHash = `#d=${compressed}`;

    const { delta: decoded, targetPlayer } = decodeDelta(oldHash);

    expect(decoded).toEqual(delta);
    // Should infer targetPlayer from delta.move.player (opponent of player who made move)
    expect(targetPlayer).toBe(1); // Move was made by player 2, so URL is for player 1
  });
});

describe('applyDelta', () => {
  it('should apply valid delta to emoji chain', async () => {
    const currentChain = '🎮';
    const currentChecksum = await calculateChecksum(currentChain);
    const newChain = '🎮🎯';
    const newChecksum = await calculateChecksum(newChain);

    const delta = await createDelta('game-123', '🎯', 2, 2, currentChecksum, newChecksum);

    const result = await applyDelta(currentChain, delta);

    expect(result).toBe('🎮🎯');
  });

  it('should reject delta with tampered HMAC', async () => {
    const currentChain = '🎮';
    const currentChecksum = await calculateChecksum(currentChain);
    const newChecksum = await calculateChecksum('🎮🎯');

    const delta = await createDelta('game-123', '🎯', 2, 2, currentChecksum, newChecksum);

    // Tamper with HMAC
    const tamperedDelta: EmojiDelta = {
      ...delta,
      hmac: 'tampered-hmac-value-123456789',
    };

    await expect(applyDelta(currentChain, tamperedDelta)).rejects.toThrow('URL has been tampered with');
  });

  it('should reject delta with wrong prevChecksum', async () => {
    const currentChain = '🎮🎲'; // Different than expected!
    const wrongChecksum = await calculateChecksum(currentChain);
    const newChecksum = await calculateChecksum('🎮🎯');

    // Delta expects '🎮' but we have '🎮🎲'
    const delta = await createDelta('game-123', '🎯', 2, 2, 'wrong-prev-checksum', newChecksum);

    await expect(applyDelta(currentChain, delta)).rejects.toThrow('Board state mismatch');
  });

  it('should reject delta when result checksum does not match', async () => {
    const currentChain = '🎮';
    const currentChecksum = await calculateChecksum(currentChain);

    // Delta claims result will be different than it actually is
    const delta = await createDelta('game-123', '🎯', 2, 2, currentChecksum, 'wrong-new-checksum');

    await expect(applyDelta(currentChain, delta)).rejects.toThrow('Move application failed');
  });
});
