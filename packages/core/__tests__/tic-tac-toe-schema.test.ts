import { describe, it, expect } from 'vitest';
import {
  CellSchema,
  BoardSchema,
  GameStatusSchema,
  PlayerSchema,
  TicTacToeGameStateSchema,
  createEmptyBoard,
  createNewTicTacToeGame,
  type Cell,
  type Board,
  type GameStatus,
  type Player,
  type TicTacToeGameState,
} from '../src/lib/tic-tac-toe-schema';

describe('CellSchema', () => {
  it('should validate null (empty cell)', () => {
    const result = CellSchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it('should validate "X"', () => {
    const result = CellSchema.safeParse('X');
    expect(result.success).toBe(true);
  });

  it('should validate "O"', () => {
    const result = CellSchema.safeParse('O');
    expect(result.success).toBe(true);
  });

  it('should reject invalid values', () => {
    expect(CellSchema.safeParse('A').success).toBe(false);
    expect(CellSchema.safeParse('').success).toBe(false);
    expect(CellSchema.safeParse(undefined).success).toBe(false);
    expect(CellSchema.safeParse(1).success).toBe(false);
  });
});

describe('BoardSchema', () => {
  it('should validate board with 9 cells', () => {
    const board: Cell[] = [null, 'X', 'O', null, 'X', null, 'O', null, 'X'];
    const result = BoardSchema.safeParse(board);
    expect(result.success).toBe(true);
  });

  it('should validate empty board (9 nulls)', () => {
    const board = Array(9).fill(null);
    const result = BoardSchema.safeParse(board);
    expect(result.success).toBe(true);
  });

  it('should reject board with wrong length', () => {
    expect(BoardSchema.safeParse([]).success).toBe(false);
    expect(BoardSchema.safeParse([null, null]).success).toBe(false);
    expect(BoardSchema.safeParse(Array(10).fill(null)).success).toBe(false);
  });

  it('should reject board with invalid cell values', () => {
    const board = [null, 'X', 'O', null, 'X', null, 'O', null, 'Invalid'];
    const result = BoardSchema.safeParse(board);
    expect(result.success).toBe(false);
  });
});

describe('GameStatusSchema', () => {
  it('should validate all valid statuses', () => {
    expect(GameStatusSchema.safeParse('playing').success).toBe(true);
    expect(GameStatusSchema.safeParse('player1_wins').success).toBe(true);
    expect(GameStatusSchema.safeParse('player2_wins').success).toBe(true);
    expect(GameStatusSchema.safeParse('draw').success).toBe(true);
  });

  it('should reject invalid statuses', () => {
    expect(GameStatusSchema.safeParse('invalid').success).toBe(false);
    expect(GameStatusSchema.safeParse('won').success).toBe(false);
    expect(GameStatusSchema.safeParse('').success).toBe(false);
  });
});

describe('PlayerSchema', () => {
  it('should validate player with id and name', () => {
    const player: Player = {
      id: crypto.randomUUID(),
      name: 'Alice',
    };
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(true);
  });

  it('should validate player with empty name', () => {
    const player: Player = {
      id: crypto.randomUUID(),
      name: '',
    };
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(true);
  });

  it('should accept player with any string id (including non-UUID)', () => {
    const player = {
      id: 'not-a-uuid', // Can be empty string or non-UUID before Player 2 joins
      name: 'Alice',
    };
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(true);
  });

  it('should reject player missing id', () => {
    const player = {
      name: 'Alice',
    };
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(false);
  });

  it('should reject player missing name', () => {
    const player = {
      id: crypto.randomUUID(),
    };
    const result = PlayerSchema.safeParse(player);
    expect(result.success).toBe(false);
  });
});

describe('TicTacToeGameStateSchema', () => {
  it('should validate complete game state', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'a'.repeat(64),
    };

    const result = TicTacToeGameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('should validate game state with empty player2 name', () => {
    const state: TicTacToeGameState = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null) as Board,
      currentTurn: 0,
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: '', name: '' }, // Player 2 not yet joined
      status: 'playing',
      checksum: 'b'.repeat(64),
    };

    const result = TicTacToeGameStateSchema.safeParse(state);
    expect(result.success).toBe(true);
  });

  it('should reject state with missing fields', () => {
    const state = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null),
      currentTurn: 0,
      // Missing currentPlayer
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'c'.repeat(64),
    };

    const result = TicTacToeGameStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it('should reject state with invalid currentPlayer', () => {
    const state = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null),
      currentTurn: 0,
      currentPlayer: 3, // Invalid: must be 1 or 2
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'd'.repeat(64),
    };

    const result = TicTacToeGameStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it('should reject state with invalid currentTurn', () => {
    const state = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null),
      currentTurn: -1, // Invalid: must be 0-9
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'e'.repeat(64),
    };

    const result = TicTacToeGameStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });

  it('should reject state with currentTurn > 9', () => {
    const state = {
      gameId: crypto.randomUUID(),
      board: Array(9).fill(null),
      currentTurn: 10, // Invalid: max 9
      currentPlayer: 1,
      player1: { id: crypto.randomUUID(), name: 'Alice' },
      player2: { id: crypto.randomUUID(), name: 'Bob' },
      status: 'playing',
      checksum: 'f'.repeat(64),
    };

    const result = TicTacToeGameStateSchema.safeParse(state);
    expect(result.success).toBe(false);
  });
});

describe('createEmptyBoard', () => {
  it('should create board with 9 null cells', () => {
    const board = createEmptyBoard();
    expect(board).toHaveLength(9);
    expect(board.every(cell => cell === null)).toBe(true);
  });

  it('should create new array each time', () => {
    const board1 = createEmptyBoard();
    const board2 = createEmptyBoard();
    expect(board1).not.toBe(board2); // Different references
    expect(board1).toEqual(board2); // Same values
  });
});

describe('createNewTicTacToeGame', () => {
  it('should create new game with correct initial state', () => {
    const gameId = crypto.randomUUID();
    const player1Id = crypto.randomUUID();
    const game = createNewTicTacToeGame(gameId, player1Id, 'Alice');

    expect(game.gameId).toBe(gameId);
    expect(game.board).toHaveLength(9);
    expect(game.board.every(cell => cell === null)).toBe(true);
    expect(game.currentTurn).toBe(0);
    expect(game.currentPlayer).toBe(1);
    expect(game.player1.id).toBe(player1Id);
    expect(game.player1.name).toBe('Alice');
    expect(game.player2.id).toBe(''); // Empty until Player 2 joins
    expect(game.player2.name).toBe('');
    expect(game.status).toBe('playing');
    expect(game.checksum).toBe(''); // Will be calculated after creation
  });

  it('should create game with empty board', () => {
    const gameId = crypto.randomUUID();
    const player1Id = crypto.randomUUID();
    const game = createNewTicTacToeGame(gameId, player1Id, 'Alice');

    expect(BoardSchema.safeParse(game.board).success).toBe(true);
  });

  it('should validate with schema', () => {
    const gameId = crypto.randomUUID();
    const player1Id = crypto.randomUUID();
    const game = createNewTicTacToeGame(gameId, player1Id, 'Alice');

    // Manually set checksum for validation
    game.checksum = 'a'.repeat(64);

    const result = TicTacToeGameStateSchema.safeParse(game);
    expect(result.success).toBe(true);
  });
});
