import type { Board, GameStatus } from './tic-tac-toe-schema';

// 8 possible winning lines: 3 rows, 3 columns, 2 diagonals
const WINNING_LINES = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Center column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal \
  [2, 4, 6], // Diagonal /
];

const WINNING_LINE_NAMES = [
  'Top Row',
  'Middle Row',
  'Bottom Row',
  'Left Column',
  'Center Column',
  'Right Column',
  'Diagonal \\',
  'Diagonal /',
];

export interface WinResult {
  winner: 'X' | 'O' | null;
  winningLine: number[] | null; // Indices of winning cells
  winningLineName: string | null; // e.g., "Top Row", "Diagonal \"
}

/**
 * Check if there's a winner on the board
 * @param board - Current board state
 * @returns Win result with winner and winning line if found
 */
export function checkWinner(board: Board): WinResult {
  for (let i = 0; i < WINNING_LINES.length; i++) {
    const [a, b, c] = WINNING_LINES[i];

    // Check if all three positions have the same mark (and not empty)
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return {
        winner: board[a] as 'X' | 'O',
        winningLine: WINNING_LINES[i],
        winningLineName: WINNING_LINE_NAMES[i],
      };
    }
  }

  return {
    winner: null,
    winningLine: null,
    winningLineName: null,
  };
}

/**
 * Check if the game is a draw (board full, no winner)
 * @param board - Current board state
 * @returns True if draw, false otherwise
 */
export function checkDraw(board: Board): boolean {
  // Board must be completely full
  const isFull = board.every(cell => cell !== null);
  if (!isFull) return false;

  // Must have no winner
  const { winner } = checkWinner(board);
  return winner === null;
}

/**
 * Calculate the current game status based on board state
 * @param board - Current board state
 * @returns Game status: playing, player1_wins, player2_wins, or draw
 */
export function calculateGameStatus(board: Board): GameStatus {
  const { winner } = checkWinner(board);

  if (winner === 'X') return 'player1_wins';
  if (winner === 'O') return 'player2_wins';
  if (checkDraw(board)) return 'draw';

  return 'playing';
}
