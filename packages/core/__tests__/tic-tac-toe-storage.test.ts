import { describe, it, expect, beforeEach } from 'vitest';
import { TicTacToeStorage } from '../src/lib/tic-tac-toe-storage';
import type { TicTacToeGameState, Board } from '../src/lib/tic-tac-toe-schema';

describe('TicTacToeStorage', () => {
  let storage: TicTacToeStorage;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storage = new TicTacToeStorage();
  });

  it('should save and load game state (round-trip)', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', null, null, 'X', null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: 'a'.repeat(64),
    };

    storage.saveGameState(state);
    const loaded = storage.loadGameState();

    expect(loaded).toEqual(state);
  });

  it('should return null when no game state saved', () => {
    const loaded = storage.loadGameState();
    expect(loaded).toBeNull();
  });

  it('should clear game state', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1Name: 'Player1',
      player2Name: '',
      status: 'playing',
      checksum: 'b'.repeat(64),
    };

    storage.saveGameState(state);
    expect(storage.loadGameState()).not.toBeNull();

    storage.clearGameState();
    expect(storage.loadGameState()).toBeNull();
  });

  it('should return null when localStorage contains invalid JSON', () => {
    localStorage.setItem('correspondence-games:tic-tac-toe-state', 'invalid-json{');

    const loaded = storage.loadGameState();
    expect(loaded).toBeNull();

    // Should also clear the invalid data
    expect(localStorage.getItem('correspondence-games:tic-tac-toe-state')).toBeNull();
  });

  it('should return null when localStorage contains invalid game state', () => {
    const invalidState = {
      gameId: 'not-a-uuid',
      board: [1, 2, 3], // Invalid board
      currentTurn: -1,
    };

    localStorage.setItem('correspondence-games:tic-tac-toe-state', JSON.stringify(invalidState));

    const loaded = storage.loadGameState();
    expect(loaded).toBeNull();

    // Should also clear the invalid data
    expect(localStorage.getItem('correspondence-games:tic-tac-toe-state')).toBeNull();
  });

  it('should overwrite existing game state when saving', () => {
    const state1: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', null, null, null, null, null, null, null, null] as Board,
      currentTurn: 1,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: 'c'.repeat(64),
    };

    const state2: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', 'X', null, null, null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 2,
      player1Name: 'Charlie',
      player2Name: 'Diana',
      status: 'playing',
      checksum: 'd'.repeat(64),
    };

    storage.saveGameState(state1);
    storage.saveGameState(state2);

    const loaded = storage.loadGameState();
    expect(loaded).toEqual(state2);
    expect(loaded).not.toEqual(state1);
  });

  it('should preserve all board states (empty, X, O)', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: ['X', 'O', null, 'X', 'O', null, 'X', 'O', null] as Board,
      currentTurn: 6,
      currentPlayer: 1,
      player1Name: 'Player1',
      player2Name: 'Player2',
      status: 'playing',
      checksum: 'e'.repeat(64),
    };

    storage.saveGameState(state);
    const loaded = storage.loadGameState();

    expect(loaded?.board[0]).toBe('X');
    expect(loaded?.board[1]).toBe('O');
    expect(loaded?.board[2]).toBeNull();
    expect(loaded?.board[3]).toBe('X');
    expect(loaded?.board[4]).toBe('O');
    expect(loaded?.board[5]).toBeNull();
  });
});
