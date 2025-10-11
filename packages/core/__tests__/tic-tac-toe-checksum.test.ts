import { describe, it, expect } from 'vitest';
import { calculateBoardChecksum } from '../src/lib/tic-tac-toe-checksum';
import type { TicTacToeGameState, Board } from '../src/lib/tic-tac-toe-schema';

describe('calculateBoardChecksum', () => {
  it('should generate same checksum for same board state', async () => {
    const state: TicTacToeGameState = {
      gameId: 'test-game-123',
      board: ['X', 'O', null, null, 'X', null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: '',
    };

    const checksum1 = await calculateBoardChecksum(state);
    const checksum2 = await calculateBoardChecksum(state);

    expect(checksum1).toBe(checksum2);
  });

  it('should generate different checksums for different board states', async () => {
    const state1: TicTacToeGameState = {
      gameId: 'test-game-123',
      board: ['X', 'O', null, null, 'X', null, null, null, null] as Board,
      currentTurn: 3,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: '',
    };

    const state2: TicTacToeGameState = {
      gameId: 'test-game-123',
      board: ['X', 'O', 'O', null, 'X', null, null, null, null] as Board, // Different board
      currentTurn: 4,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: '',
    };

    const checksum1 = await calculateBoardChecksum(state1);
    const checksum2 = await calculateBoardChecksum(state2);

    expect(checksum1).not.toBe(checksum2);
  });

  it('should generate 64-character hex string (SHA-256)', async () => {
    const state: TicTacToeGameState = {
      gameId: 'test-game-123',
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: '',
      status: 'playing',
      checksum: '',
    };

    const checksum = await calculateBoardChecksum(state);

    expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(checksum.length).toBe(64);
  });

  it('should be deterministic across multiple calls', async () => {
    const state: TicTacToeGameState = {
      gameId: 'deterministic-test',
      board: ['X', 'X', 'O', 'O', 'X', null, null, null, null] as Board,
      currentTurn: 5,
      currentPlayer: 1,
      player1Name: 'Player1',
      player2Name: 'Player2',
      status: 'playing',
      checksum: '',
    };

    const checksums = await Promise.all([
      calculateBoardChecksum(state),
      calculateBoardChecksum(state),
      calculateBoardChecksum(state),
    ]);

    expect(checksums[0]).toBe(checksums[1]);
    expect(checksums[1]).toBe(checksums[2]);
  });

  it('should change checksum when player name changes', async () => {
    const state1: TicTacToeGameState = {
      gameId: 'test-game-123',
      board: ['X', null, null, null, null, null, null, null, null] as Board,
      currentTurn: 1,
      currentPlayer: 2,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: '',
    };

    const state2: TicTacToeGameState = {
      ...state1,
      player2Name: 'Charlie', // Different player name
    };

    const checksum1 = await calculateBoardChecksum(state1);
    const checksum2 = await calculateBoardChecksum(state2);

    expect(checksum1).not.toBe(checksum2);
  });

  it('should change checksum when game status changes', async () => {
    const state1: TicTacToeGameState = {
      gameId: 'test-game-123',
      board: ['X', 'X', 'X', 'O', 'O', null, null, null, null] as Board,
      currentTurn: 5,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: 'Bob',
      status: 'playing',
      checksum: '',
    };

    const state2: TicTacToeGameState = {
      ...state1,
      status: 'player1_wins', // Different status
    };

    const checksum1 = await calculateBoardChecksum(state1);
    const checksum2 = await calculateBoardChecksum(state2);

    expect(checksum1).not.toBe(checksum2);
  });
});
