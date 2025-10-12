import { describe, it, expect } from 'vitest';
import { encodeFullState, decodeFullState } from '../src/lib/tic-tac-toe-url-encoder';
import type { TicTacToeGameState, Board } from '../src/lib/tic-tac-toe-schema';

describe('encodeFullState', () => {
  it('should encode game state to hash fragment', () => {
    const player1Id = crypto.randomUUID();
    const player2Id = crypto.randomUUID();
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', null, null, null, null, null, null, null, null] as Board,
      currentTurn: 1,
      currentPlayer: 2,
      player1: { id: player1Id, name: 'Alice' },
      player2: { id: player2Id, name: '' },
      status: 'playing',
      checksum: 'a'.repeat(64),
    };

    const hashFragment = encodeFullState(state, player2Id);

    expect(hashFragment).toMatch(/^#s=/);
    expect(hashFragment.length).toBeLessThan(2000);
  });

  it('should encode with targetPlayer=1', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: '' },
      status: 'playing',
      checksum: 'b'.repeat(64),
    };

    const hash = encodeFullState(state, state.player1.id);

    expect(hash).toMatch(/^#s=.+$/);
    expect(hash).not.toContain('&p='); // No visible player parameter
    expect(hash).not.toContain('targetPlayer'); // Not visible in URL
  });

  it('should encode with targetPlayer=2', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', null, null, 'X', null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 2,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'c'.repeat(64),
    };

    const hash = encodeFullState(state, state.player2.id);

    expect(hash).toMatch(/^#s=.+$/);
    expect(hash).not.toContain('&p=');
    expect(hash).not.toContain('targetPlayer');
  });

  it('should produce valid compressed hash fragment', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'X', 'O', 'O', 'X', null, null, null, null] as Board,
      currentTurn: 5,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'd'.repeat(64),
    };

    const hashFragment = encodeFullState(state, state.player2.id);

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

  it('should round-trip game state through encoding and decoding', () => {
    const original: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', 'X', null, null, null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 2,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'e'.repeat(64),
    };

    const encoded = encodeFullState(original, original.player1.id);
    const { state: decoded, targetPlayerId } = decodeFullState(encoded);

    expect(decoded).toEqual(original);
    expect(targetPlayerId).toBe(original.player1.id);
  });

  it('should decode and extract targetPlayer=1', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', null, null, null, 'O', null, null, null, null] as Board,
      currentTurn: 2,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Player1' },
      player2: { id: crypto.randomUUID(), name: 'Player2' },
      status: 'playing',
      checksum: 'f'.repeat(64),
    };

    const hash = encodeFullState(state, state.player1.id);
    const { state: decoded, targetPlayerId } = decodeFullState(hash);

    expect(decoded).toEqual(state);
    expect(targetPlayerId).toBe(state.player1.id);
  });

  it('should decode and extract targetPlayer=2', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', null, 'X', null, null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Player1' },
      player2: { id: crypto.randomUUID(), name: 'Player2' },
      status: 'playing',
      checksum: 'g'.repeat(64),
    };

    const hash = encodeFullState(state, state.player2.id);
    const { state: decoded, targetPlayerId } = decodeFullState(hash);

    expect(decoded).toEqual(state);
    expect(targetPlayerId).toBe(state.player2.id);
  });

  it('should handle game with empty player2Name', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: '' }, // Empty until Player 2 joins
      status: 'playing',
      checksum: 'h'.repeat(64),
    };

    const hash = encodeFullState(state, state.player2.id);
    const { state: decoded, targetPlayerId } = decodeFullState(hash);

    expect(decoded.player2.name).toBe('');
    expect(targetPlayerId).toBe(state.player2.id);
  });

  it('should handle game in progress with multiple moves', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', 'X', 'O', 'X', null, null, null, null] as Board,
      currentTurn: 5,
      currentPlayer: 2,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'i'.repeat(64),
    };

    const encoded = encodeFullState(state, state.player2.id);
    const { state: decoded } = decodeFullState(encoded);

    expect(decoded.board).toEqual(state.board);
    expect(decoded.currentTurn).toBe(5);
    expect(decoded.currentPlayer).toBe(2);
  });

  it('should handle game with win status', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'X', 'X', 'O', 'O', null, null, null, null] as Board,
      currentTurn: 5,
      currentPlayer: 2,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'player1_wins',
      checksum: 'j'.repeat(64),
    };

    const encoded = encodeFullState(state, state.player2.id);
    const { state: decoded } = decodeFullState(encoded);

    expect(decoded.status).toBe('player1_wins');
    expect(decoded.board).toEqual(state.board);
  });

  it('should handle game with draw status', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', 'X', 'X', 'X', 'O', 'O', 'X', 'O'] as Board,
      currentTurn: 9,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'draw',
      checksum: 'k'.repeat(64),
    };

    const encoded = encodeFullState(state, state.player1.id);
    const { state: decoded } = decodeFullState(encoded);

    expect(decoded.status).toBe('draw');
    expect(decoded.board.every(cell => cell !== null)).toBe(true);
  });
});
