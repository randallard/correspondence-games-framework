import { describe, it, expect } from 'vitest';
import { EmojiGameStateSchema } from '../src/lib/emoji-game-schema';

describe('EmojiGameStateSchema', () => {
  it('should validate valid emoji game state with player names', () => {
    const state = {
      gameId: crypto.randomUUID(),
      emojiChain: '🎮',
      currentTurn: 1,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: 'Bob',
      checksum: 'abc123',
    };

    expect(() => EmojiGameStateSchema.parse(state)).not.toThrow();
  });

  it('should allow empty player2Name for initial game state', () => {
    const state = {
      gameId: crypto.randomUUID(),
      emojiChain: '',
      currentTurn: 0,
      currentPlayer: 1,
      player1Name: 'Alice',
      player2Name: '',
      checksum: 'abc123',
    };

    expect(() => EmojiGameStateSchema.parse(state)).not.toThrow();
  });

  it('should reject state without player names', () => {
    const state = {
      gameId: crypto.randomUUID(),
      emojiChain: '🎮',
      currentTurn: 1,
      currentPlayer: 1,
      checksum: 'abc123',
    };

    expect(() => EmojiGameStateSchema.parse(state)).toThrow();
  });
});
