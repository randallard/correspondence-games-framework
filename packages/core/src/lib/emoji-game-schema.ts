import { z } from 'zod';

export const EmojiGameStateSchema = z.object({
  gameId: z.string().uuid(),
  emojiChain: z.string(),
  currentTurn: z.number().int().min(0), // Changed to min(0) to allow initial state
  currentPlayer: z.union([z.literal(1), z.literal(2)]),
  player1Name: z.string().min(1), // Player 1 must have a name
  player2Name: z.string(), // Player 2 name can be empty initially
  checksum: z.string(),
});

export type EmojiGameState = z.infer<typeof EmojiGameStateSchema>;
