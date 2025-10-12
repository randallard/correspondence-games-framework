import LZString from 'lz-string';
import { TicTacToeGameStateSchema, type TicTacToeGameState } from './tic-tac-toe-schema';

/**
 * Payload structure for full state encoding with embedded target player ID.
 */
interface FullStatePayload {
  state: TicTacToeGameState;
  targetPlayerId: string;  // WHO this URL is for (by player ID)
}

/**
 * Encodes full game state into URL hash fragment with embedded target player ID.
 * The player ID is hidden inside the compressed payload.
 *
 * @param state - The game state to encode
 * @param targetPlayerId - Which player this URL is intended for (by player ID)
 * @returns Hash fragment like "#s=<compressed-payload>" (player ID embedded, not visible)
 */
export function encodeFullState(state: TicTacToeGameState, targetPlayerId: string): string {
  const payload: FullStatePayload = { state, targetPlayerId };
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#s=${compressed}`;
}

/**
 * Decodes full game state from URL hash fragment, extracting embedded target player ID.
 *
 * @param hashFragment - Hash like "#s=<compressed-payload>"
 * @returns Object with state and targetPlayerId (extracted from payload)
 */
export function decodeFullState(hashFragment: string): { state: TicTacToeGameState; targetPlayerId: string } {
  const compressed = hashFragment.substring(3); // Remove '#s='
  const json = LZString.decompressFromEncodedURIComponent(compressed);

  if (!json) {
    throw new Error('Failed to decompress hash fragment');
  }

  const payload = JSON.parse(json);

  // Handle backward compatibility: old URLs without targetPlayerId
  if (payload.targetPlayerId === undefined) {
    // Check for old targetPlayer format (number)
    if (payload.targetPlayer !== undefined) {
      const state = TicTacToeGameStateSchema.parse(payload.state);
      // Convert old targetPlayer (1|2) to player ID from state
      const targetPlayerId = payload.targetPlayer === 1 ? state.player1.id : state.player2.id;
      return { state, targetPlayerId };
    }

    // Very old format: payload is the state itself
    const state = TicTacToeGameStateSchema.parse(payload);
    // Infer target player from currentPlayer (best guess for migration)
    const targetPlayerId = state.currentPlayer === 1 ? state.player1.id : state.player2.id;
    return { state, targetPlayerId };
  }

  // New format: payload has state and targetPlayerId
  if (!payload.targetPlayerId || typeof payload.targetPlayerId !== 'string') {
    throw new Error('Invalid target player ID in URL payload');
  }

  const state = TicTacToeGameStateSchema.parse(payload.state);
  return { state, targetPlayerId: payload.targetPlayerId };
}
