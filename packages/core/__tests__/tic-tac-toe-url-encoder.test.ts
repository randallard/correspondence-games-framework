import { describe, it, expect } from 'vitest';
import { encodeFullState, decodeFullState } from '../src/lib/tic-tac-toe-url-encoder';
import type { TicTacToeGameState, Board } from '../src/lib/tic-tac-toe-schema';

describe('encodeFullState', () => {
  it('should encode game state to hash fragment', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', null, null, null, null, null, null, null, null] as Board,
      currentTurn: 1,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: '',
      status: 'playing',
      checksum: 'a'.repeat(64),
    };

    const hashFragment = encodeFullState(state, 2);

    expect(hashFragment).toMatch(/^#s=/);
    expect(hashFragment.length).toBeLessThan(2000);
  });

  it('should encode with targetPlayer=1', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: '',
      status: 'playing',
      checksum: 'b'.repeat(64),
    };

    const hash = encodeFullState(state, 1);

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
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: 'c'.repeat(64),
    };

    const hash = encodeFullState(state, 2);

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
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: 'd'.repeat(64),
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

  it('should round-trip game state through encoding and decoding', () => {
    const original: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', 'X', null, null, null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: 'e'.repeat(64),
    };

    const encoded = encodeFullState(original, 1);
    const { state: decoded, targetPlayer } = decodeFullState(encoded);

    expect(decoded).toEqual(original);
    expect(targetPlayer).toBe(1);
  });

  it('should decode and extract targetPlayer=1', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', null, null, null, 'O', null, null, null, null] as Board,
      currentTurn: 2,
      currentPlayer: 1,
      player1Name: 'Player1',
      player2Name: 'Player2',
      status: 'playing',
      checksum: 'f'.repeat(64),
    };

    const hash = encodeFullState(state, 1);
    const { state: decoded, targetPlayer } = decodeFullState(hash);

    expect(decoded).toEqual(state);
    expect(targetPlayer).toBe(1);
  });

  it('should decode and extract targetPlayer=2', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', null, 'X', null, null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 1,
      player1Name: 'Player1',
      player2Name: 'Player2',
      status: 'playing',
      checksum: 'g'.repeat(64),
    };

    const hash = encodeFullState(state, 2);
    const { state: decoded, targetPlayer } = decodeFullState(hash);

    expect(decoded).toEqual(state);
    expect(targetPlayer).toBe(2);
  });

  it('should handle game with empty player2Name', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: '', // Empty until Player 2 joins
      status: 'playing',
      checksum: 'h'.repeat(64),
    };

    const hash = encodeFullState(state, 2);
    const { state: decoded, targetPlayer } = decodeFullState(hash);

    expect(decoded.player2Name).toBe('');
    expect(targetPlayer).toBe(2);
  });

  it('should handle game in progress with multiple moves', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', 'X', 'O', 'X', null, null, null, null] as Board,
      currentTurn: 5,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: 'i'.repeat(64),
    };

    const encoded = encodeFullState(state, 2);
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
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'player1_wins',
      checksum: 'j'.repeat(64),
    };

    const encoded = encodeFullState(state, 2);
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
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'draw',
      checksum: 'k'.repeat(64),
    };

    const encoded = encodeFullState(state, 1);
    const { state: decoded } = decodeFullState(encoded);

    expect(decoded.status).toBe('draw');
    expect(decoded.board.every(cell => cell !== null)).toBe(true);
  });
});
