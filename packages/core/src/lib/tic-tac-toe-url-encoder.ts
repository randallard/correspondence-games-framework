import LZString from 'lz-string';
import { TicTacToeGameStateSchema, type TicTacToeGameState } from './tic-tac-toe-schema';

/**
 * Payload structure for full state encoding with embedded target player.
 */
interface FullStatePayload {
  state: TicTacToeGameState;
  targetPlayer: 1 | 2;
}

/**
 * Encodes full game state into URL hash fragment with embedded target player indicator.
 * The player number is hidden inside the compressed payload.
 *
 * @param state - The game state to encode
 * @param targetPlayer - Which player this URL is intended for (1 or 2)
 * @returns Hash fragment like "#s=<compressed-payload>" (player embedded, not visible)
 */
export function encodeFullState(state: TicTacToeGameState, targetPlayer: 1 | 2): string {
  const payload: FullStatePayload = { state, targetPlayer };
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#s=${compressed}`;
}

/**
 * Decodes full game state from URL hash fragment, extracting embedded target player.
 *
 * @param hashFragment - Hash like "#s=<compressed-payload>"
 * @returns Object with state and targetPlayer (extracted from payload)
 */
export function decodeFullState(hashFragment: string): { state: TicTacToeGameState; targetPlayer: 1 | 2 } {
  const compressed = hashFragment.substring(3); // Remove '#s='
  const json = LZString.decompressFromEncodedURIComponent(compressed);

  if (!json) {
    throw new Error('Failed to decompress hash fragment');
  }

  const payload = JSON.parse(json);

  // Handle backward compatibility: old URLs without targetPlayer
  if (payload.targetPlayer === undefined) {
    // Old format: payload is the state itself
    const state = TicTacToeGameStateSchema.parse(payload);
    // Infer target player from currentPlayer (best guess for migration)
    const targetPlayer = state.currentPlayer;
    return { state, targetPlayer };
  }

  // New format: payload has state and targetPlayer
  if (payload.targetPlayer !== 1 && payload.targetPlayer !== 2) {
    throw new Error('Invalid target player in URL payload');
  }

  const state = TicTacToeGameStateSchema.parse(payload.state);
  return { state, targetPlayer: payload.targetPlayer };
}
