import { describe, it, expect } from 'vitest';
import {
  createDelta,
  encodeDelta,
  decodeDelta,
  applyDelta,
  type TicTacToeDelta,
} from '../src/lib/tic-tac-toe-delta';
import { calculateChecksum } from '../src/lib/checksum';
import type { Board } from '../src/lib/tic-tac-toe-schema';

describe('createDelta', () => {
  it('should create delta with move and checksums', async () => {
    const delta = await createDelta(
      'game-123',
      4, // Center cell
      'X',
      1,
      1,
      'checksum-turn-0',
      'checksum-turn-1'
    );

    expect(delta.gameId).toBe('game-123');
    expect(delta.move.cellIndex).toBe(4);
    expect(delta.move.mark).toBe('X');
    expect(delta.move.player).toBe(1);
    expect(delta.move.turn).toBe(1);
    expect(delta.prevChecksum).toBe('checksum-turn-0');
    expect(delta.newChecksum).toBe('checksum-turn-1');
    expect(delta.hmac).toBeDefined();
    expect(delta.hmac).toMatch(/^[a-f0-9]+$/); // Hex string
  });

  it('should generate different HMACs for different deltas', async () => {
    const delta1 = await createDelta('game-123', 0, 'X', 1, 1, 'prev1', 'new1');
    const delta2 = await createDelta('game-123', 1, 'O', 2, 2, 'prev2', 'new2');

    expect(delta1.hmac).not.toBe(delta2.hmac);
  });

  it('should generate same HMAC for same delta', async () => {
    const delta1 = await createDelta('game-123', 4, 'X', 1, 1, 'prev1', 'new1');
    const delta2 = await createDelta('game-123', 4, 'X', 1, 1, 'prev1', 'new1');

    expect(delta1.hmac).toBe(delta2.hmac);
  });
});

describe('encodeDelta', () => {
  it('should encode delta to hash fragment', async () => {
    const delta = await createDelta('game-123', 0, 'X', 1, 1, 'prev1', 'new1');
    const hashFragment = encodeDelta(delta, "player2-id");

    expect(hashFragment).toMatch(/^#d=/);
    expect(hashFragment.length).toBeLessThan(2000);
  });

  it('should encode delta with targetPlayer=1', async () => {
    const delta = await createDelta('game-123', 4, 'O', 2, 2, 'prev1', 'new1');
    const hash = encodeDelta(delta, "player1-id");

    expect(hash).toMatch(/^#d=.+$/);
    expect(hash).not.toContain('&p='); // No visible player parameter
    expect(hash).not.toContain('targetPlayer'); // Not visible in URL
  });

  it('should encode delta with targetPlayer=2', async () => {
    const delta = await createDelta('game-123', 8, 'X', 1, 3, 'prev1', 'new1');
    const hash = encodeDelta(delta, "player2-id");

    expect(hash).toMatch(/^#d=.+$/);
    expect(hash).not.toContain('&p=');
    expect(hash).not.toContain('targetPlayer');
  });
});

describe('decodeDelta', () => {
  it('should decode delta from hash fragment', async () => {
    const delta = await createDelta('game-123', 4, 'X', 1, 1, 'prev1', 'new1');
    const hashFragment = encodeDelta(delta, "player2-id");

    const { delta: decoded, targetPlayerId } = decodeDelta(hashFragment);

    expect(decoded.gameId).toBe('game-123');
    expect(decoded.move.cellIndex).toBe(4);
    expect(decoded.move.mark).toBe('X');
    expect(decoded.move.player).toBe(1);
    expect(decoded.move.turn).toBe(1);
    expect(decoded.prevChecksum).toBe('prev1');
    expect(decoded.newChecksum).toBe('new1');
    expect(decoded.hmac).toBe(delta.hmac);
    expect(targetPlayerId).toBe("player2-id");
  });

  it('should round-trip encode/decode delta', async () => {
    const originalDelta = await createDelta('game-456', 3, 'O', 2, 5, 'checksumA', 'checksumB');
    const encoded = encodeDelta(originalDelta, "player1-id");
    const { delta: decoded, targetPlayerId } = decodeDelta(encoded);

    expect(decoded).toEqual(originalDelta);
    expect(targetPlayerId).toBe("player1-id");
  });

  it('should decode delta and extract targetPlayer=1', async () => {
    const delta = await createDelta('game-123', 7, 'X', 1, 4, 'prev1', 'new1');
    const hash = encodeDelta(delta, "player1-id");
    const { delta: decoded, targetPlayerId } = decodeDelta(hash);

    expect(decoded).toEqual(delta);
    expect(targetPlayerId).toBe("player1-id");
  });

  it('should decode delta and extract targetPlayer=2', async () => {
    const delta = await createDelta('game-123', 2, 'O', 2, 3, 'prev1', 'new1');
    const hash = encodeDelta(delta, "player2-id");
    const { delta: decoded, targetPlayerId } = decodeDelta(hash);

    expect(decoded).toEqual(delta);
    expect(targetPlayerId).toBe("player2-id");
  });

  it('should reject old delta URL format', async () => {
    const delta = await createDelta('game-123', 5, 'X', 1, 2, 'prev1', 'new1');

    // Manually create old-format delta URL (no targetPlayer wrapper)
    const oldFormatJson = JSON.stringify(delta);
    const LZString = require('lz-string');
    const compressed = LZString.compressToEncodedURIComponent(oldFormatJson);
    const oldHash = `#d=${compressed}`;

    // Old format should throw error
    expect(() => decodeDelta(oldHash)).toThrow('Old URL format not supported');
  });
});

describe('applyDelta', () => {
  it('should apply valid delta to board', async () => {
    const currentBoard: Board = ['X', null, null, null, null, null, null, null, null];
    const currentChecksum = await calculateChecksum(JSON.stringify(currentBoard));

    const newBoard: Board = ['X', 'O', null, null, null, null, null, null, null];
    const newChecksum = await calculateChecksum(JSON.stringify(newBoard));

    const delta = await createDelta('game-123', 1, 'O', 2, 2, currentChecksum, newChecksum);

    const result = await applyDelta(currentBoard, delta);

    expect(result[0]).toBe('X');
    expect(result[1]).toBe('O');
    expect(result.slice(2)).toEqual(Array(7).fill(null));
  });

  it('should reject delta with tampered HMAC', async () => {
    const currentBoard: Board = ['X', null, null, null, null, null, null, null, null];
    const currentChecksum = await calculateChecksum(JSON.stringify(currentBoard));

    const newBoard: Board = ['X', 'O', null, null, null, null, null, null, null];
    const newChecksum = await calculateChecksum(JSON.stringify(newBoard));

    const delta = await createDelta('game-123', 1, 'O', 2, 2, currentChecksum, newChecksum);

    // Tamper with HMAC
    const tamperedDelta: TicTacToeDelta = {
      ...delta,
      hmac: 'tampered-hmac-value-123456789',
    };

    await expect(applyDelta(currentBoard, tamperedDelta)).rejects.toThrow('URL has been tampered with');
  });

  it('should reject delta with wrong prevChecksum', async () => {
    const currentBoard: Board = ['X', 'O', null, null, null, null, null, null, null];
    const actualChecksum = await calculateChecksum(JSON.stringify(currentBoard));

    const newBoard: Board = ['X', 'O', 'X', null, null, null, null, null, null];
    const newChecksum = await calculateChecksum(JSON.stringify(newBoard));

    // Delta expects different previous state
    const delta = await createDelta('game-123', 2, 'X', 1, 3, 'wrong-prev-checksum', newChecksum);

    await expect(applyDelta(currentBoard, delta)).rejects.toThrow('Board state mismatch');
  });

  it('should reject delta when result checksum does not match', async () => {
    const currentBoard: Board = ['X', null, null, null, null, null, null, null, null];
    const currentChecksum = await calculateChecksum(JSON.stringify(currentBoard));

    // Delta claims wrong result checksum
    const delta = await createDelta('game-123', 1, 'O', 2, 2, currentChecksum, 'wrong-new-checksum');

    await expect(applyDelta(currentBoard, delta)).rejects.toThrow('Move application failed');
  });

  it('should reject delta on occupied cell', async () => {
    const currentBoard: Board = ['X', 'O', null, null, null, null, null, null, null];
    const currentChecksum = await calculateChecksum(JSON.stringify(currentBoard));
    const fakeNewChecksum = 'fake-checksum';

    // Try to place X on already occupied cell 1
    const delta = await createDelta('game-123', 1, 'X', 1, 3, currentChecksum, fakeNewChecksum);

    await expect(applyDelta(currentBoard, delta)).rejects.toThrow('already occupied');
  });

  it('should handle multiple consecutive deltas', async () => {
    let board: Board = Array(9).fill(null) as Board;
    const gameId = 'game-123';

    // Turn 1: X at position 0
    const prevChecksum1 = await calculateChecksum(JSON.stringify(board));
    const newBoard1: Board = [...board];
    newBoard1[0] = 'X';
    const newChecksum1 = await calculateChecksum(JSON.stringify(newBoard1));

    const delta1 = await createDelta(gameId, 0, 'X', 1, 1, prevChecksum1, newChecksum1);
    board = await applyDelta(board, delta1);
    expect(board[0]).toBe('X');

    // Turn 2: O at position 4
    const prevChecksum2 = await calculateChecksum(JSON.stringify(board));
    const newBoard2: Board = [...board];
    newBoard2[4] = 'O';
    const newChecksum2 = await calculateChecksum(JSON.stringify(newBoard2));

    const delta2 = await createDelta(gameId, 4, 'O', 2, 2, prevChecksum2, newChecksum2);
    board = await applyDelta(board, delta2);
    expect(board[0]).toBe('X');
    expect(board[4]).toBe('O');
  });
});
