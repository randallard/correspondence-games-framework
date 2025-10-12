import LZString from 'lz-string';
import { calculateChecksum } from './checksum';
import type { Board } from './tic-tac-toe-schema';

const GAME_SECRET = 'tic-tac-toe-game-secret-key'; // TODO: Make this configurable

export interface TicTacToeDelta {
  gameId: string;
  move: {
    player: 1 | 2;
    cellIndex: number; // 0-8
    mark: 'X' | 'O';
    turn: number;
  };
  prevChecksum: string;
  newChecksum: string;
  hmac: string;
}

async function generateHMAC(data: string): Promise<string> {
  const encoder = new TextEncoder();

  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(GAME_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export async function createDelta(
  gameId: string,
  cellIndex: number,
  mark: 'X' | 'O',
  player: 1 | 2,
  turn: number,
  prevChecksum: string,
  newChecksum: string
): Promise<TicTacToeDelta> {
  const delta: Omit<TicTacToeDelta, 'hmac'> = {
    gameId,
    move: { player, cellIndex, mark, turn },
    prevChecksum,
    newChecksum,
  };

  const hmac = await generateHMAC(JSON.stringify(delta));

  return { ...delta, hmac };
}

/**
 * Payload structure for delta encoding with embedded target player ID.
 */
interface DeltaPayload {
  delta: TicTacToeDelta;
  targetPlayerId: string;  // WHO this URL is for (by player ID)
}

/**
 * Encodes delta into URL hash fragment with embedded target player ID.
 * The player ID is hidden inside the compressed payload.
 *
 * @param delta - The delta to encode
 * @param targetPlayerId - Which player this URL is intended for (by player ID)
 * @returns Hash fragment like "#d=<compressed-payload>" (player ID embedded, not visible)
 */
export function encodeDelta(delta: TicTacToeDelta, targetPlayerId: string): string {
  const payload: DeltaPayload = { delta, targetPlayerId };
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#d=${compressed}`;
}

/**
 * Decodes delta from URL hash fragment, extracting embedded target player ID.
 *
 * @param hashFragment - Hash like "#d=<compressed-payload>"
 * @returns Object with delta and targetPlayerId (extracted from payload)
 */
export function decodeDelta(hashFragment: string): { delta: TicTacToeDelta; targetPlayerId: string } {
  const compressed = hashFragment.substring(3); // Remove '#d='
  const json = LZString.decompressFromEncodedURIComponent(compressed);

  if (!json) {
    throw new Error('Failed to decompress delta hash fragment');
  }

  const payload = JSON.parse(json);

  // Handle backward compatibility: old URLs without targetPlayerId
  if (payload.targetPlayerId === undefined) {
    // Check for old targetPlayer format (number)
    if (payload.targetPlayer !== undefined) {
      // Old format with targetPlayer number - but we need player ID
      // Can't fully convert without game state, so throw error
      throw new Error('Old URL format not supported - please generate new URL');
    }

    // Very old format: payload is the delta itself
    // Can't determine target player ID without game state
    throw new Error('Old URL format not supported - please generate new URL');
  }

  // New format: payload has delta and targetPlayerId
  if (!payload.targetPlayerId || typeof payload.targetPlayerId !== 'string') {
    throw new Error('Invalid target player ID in URL payload');
  }

  return { delta: payload.delta, targetPlayerId: payload.targetPlayerId };
}

export async function applyDelta(
  currentBoard: Board,
  delta: TicTacToeDelta
): Promise<Board> {
  // 1. Verify HMAC (tamper detection)
  const expectedHmac = await generateHMAC(
    JSON.stringify({
      gameId: delta.gameId,
      move: delta.move,
      prevChecksum: delta.prevChecksum,
      newChecksum: delta.newChecksum,
    })
  );

  if (delta.hmac !== expectedHmac) {
    throw new Error('URL has been tampered with - HMAC mismatch');
  }

  // 2. Verify current state matches expected previous state
  const currentChecksum = await calculateChecksum(JSON.stringify(currentBoard));
  if (currentChecksum !== delta.prevChecksum) {
    throw new Error(
      'Board state mismatch - current state does not match expected previous state'
    );
  }

  // 3. Validate cell is empty
  if (currentBoard[delta.move.cellIndex] !== null) {
    throw new Error(
      `Cell ${delta.move.cellIndex} is already occupied by ${currentBoard[delta.move.cellIndex]}`
    );
  }

  // 4. Apply move
  const newBoard: Board = [...currentBoard];
  newBoard[delta.move.cellIndex] = delta.move.mark;

  // 5. Verify result matches expected new state
  const newChecksum = await calculateChecksum(JSON.stringify(newBoard));
  if (newChecksum !== delta.newChecksum) {
    throw new Error('Move application failed - checksum mismatch');
  }

  return newBoard;
}
