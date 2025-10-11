import { describe, it, expect } from 'vitest';
import {
  checkWinner,
  checkDraw,
  calculateGameStatus,
  type WinResult,
} from '../src/lib/tic-tac-toe-game-logic';
import type { Board } from '../src/lib/tic-tac-toe-schema';

describe('checkWinner', () => {
  it('should detect top row win (X)', () => {
    const board: Board = [
      'X', 'X', 'X',
      'O', 'O', null,
      null, null, null
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('X');
    expect(result.winningLine).toEqual([0, 1, 2]);
    expect(result.winningLineName).toBe('Top Row');
  });

  it('should detect middle row win (O)', () => {
    const board: Board = [
      'X', 'X', null,
      'O', 'O', 'O',
      null, null, 'X'
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('O');
    expect(result.winningLine).toEqual([3, 4, 5]);
    expect(result.winningLineName).toBe('Middle Row');
  });

  it('should detect bottom row win (X)', () => {
    const board: Board = [
      'O', 'O', null,
      null, null, 'O',
      'X', 'X', 'X'
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('X');
    expect(result.winningLine).toEqual([6, 7, 8]);
    expect(result.winningLineName).toBe('Bottom Row');
  });

  it('should detect left column win (O)', () => {
    const board: Board = [
      'O', 'X', 'X',
      'O', null, null,
      'O', null, 'X'
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('O');
    expect(result.winningLine).toEqual([0, 3, 6]);
    expect(result.winningLineName).toBe('Left Column');
  });

  it('should detect center column win (X)', () => {
    const board: Board = [
      'O', 'X', null,
      null, 'X', 'O',
      'O', 'X', null
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('X');
    expect(result.winningLine).toEqual([1, 4, 7]);
    expect(result.winningLineName).toBe('Center Column');
  });

  it('should detect right column win (O)', () => {
    const board: Board = [
      'X', 'X', 'O',
      null, null, 'O',
      'X', null, 'O'
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('O');
    expect(result.winningLine).toEqual([2, 5, 8]);
    expect(result.winningLineName).toBe('Right Column');
  });

  it('should detect diagonal \\ win (X)', () => {
    const board: Board = [
      'X', 'O', 'O',
      null, 'X', null,
      'O', null, 'X'
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('X');
    expect(result.winningLine).toEqual([0, 4, 8]);
    expect(result.winningLineName).toBe('Diagonal \\');
  });

  it('should detect diagonal / win (O)', () => {
    const board: Board = [
      'X', 'X', 'O',
      null, 'O', null,
      'O', null, 'X'
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('O');
    expect(result.winningLine).toEqual([2, 4, 6]);
    expect(result.winningLineName).toBe('Diagonal /');
  });

  it('should return null when no winner on partial board', () => {
    const board: Board = [
      'X', 'O', 'X',
      null, null, null,
      null, null, null
    ];

    const result = checkWinner(board);
    expect(result.winner).toBeNull();
    expect(result.winningLine).toBeNull();
    expect(result.winningLineName).toBeNull();
  });

  it('should return null on empty board', () => {
    const board: Board = Array(9).fill(null) as Board;

    const result = checkWinner(board);
    expect(result.winner).toBeNull();
    expect(result.winningLine).toBeNull();
    expect(result.winningLineName).toBeNull();
  });

  it('should detect first winning pattern when multiple exist', () => {
    // X wins both top row and left column
    const board: Board = [
      'X', 'X', 'X',
      'X', 'O', 'O',
      'X', null, null
    ];

    const result = checkWinner(board);
    expect(result.winner).toBe('X');
    // Should return first winning pattern found (top row)
    expect(result.winningLine).toEqual([0, 1, 2]);
  });
});

describe('checkDraw', () => {
  it('should detect draw when board full and no winner', () => {
    const board: Board = [
      'X', 'O', 'X',
      'X', 'X', 'O',
      'O', 'X', 'O'
    ];

    const isDraw = checkDraw(board);
    expect(isDraw).toBe(true);
  });

  it('should return false when board not full', () => {
    const board: Board = [
      'X', 'O', 'X',
      'X', null, 'O',
      'O', 'X', 'O'
    ];

    const isDraw = checkDraw(board);
    expect(isDraw).toBe(false);
  });

  it('should return false when winner exists', () => {
    const board: Board = [
      'X', 'X', 'X',
      'O', 'O', null,
      null, null, null
    ];

    const isDraw = checkDraw(board);
    expect(isDraw).toBe(false);
  });

  it('should return false on empty board', () => {
    const board: Board = Array(9).fill(null) as Board;

    const isDraw = checkDraw(board);
    expect(isDraw).toBe(false);
  });
});

describe('calculateGameStatus', () => {
  it('should return "playing" for partial board with no winner', () => {
    const board: Board = [
      'X', 'O', null,
      null, 'X', null,
      null, null, null
    ];

    const status = calculateGameStatus(board);
    expect(status).toBe('playing');
  });

  it('should return "player1_wins" when X wins', () => {
    const board: Board = [
      'X', 'X', 'X',
      'O', 'O', null,
      null, null, null
    ];

    const status = calculateGameStatus(board);
    expect(status).toBe('player1_wins');
  });

  it('should return "player2_wins" when O wins', () => {
    const board: Board = [
      'X', 'X', null,
      'O', 'O', 'O',
      null, null, 'X'
    ];

    const status = calculateGameStatus(board);
    expect(status).toBe('player2_wins');
  });

  it('should return "draw" when board full and no winner', () => {
    const board: Board = [
      'X', 'O', 'X',
      'X', 'X', 'O',
      'O', 'X', 'O'
    ];

    const status = calculateGameStatus(board);
    expect(status).toBe('draw');
  });

  it('should return "playing" for empty board', () => {
    const board: Board = Array(9).fill(null) as Board;

    const status = calculateGameStatus(board);
    expect(status).toBe('playing');
  });

  it('should prioritize win over draw', () => {
    // If somehow board is full with a winner (shouldn't happen in real game)
    const board: Board = [
      'X', 'X', 'X',
      'O', 'O', 'X',
      'O', 'X', 'O'
    ];

    const status = calculateGameStatus(board);
    expect(status).toBe('player1_wins'); // Win takes precedence
  });
});
