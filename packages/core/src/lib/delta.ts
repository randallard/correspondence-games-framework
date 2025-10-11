import LZString from 'lz-string';
import { calculateChecksum } from './checksum';

const GAME_SECRET = 'emoji-game-secret-key'; // TODO: Make this configurable

export interface EmojiDelta {
  gameId: string;
  move: {
    player: 1 | 2;
    emoji: string;
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
  emoji: string,
  player: 1 | 2,
  turn: number,
  prevChecksum: string,
  newChecksum: string
): Promise<EmojiDelta> {
  const delta: Omit<EmojiDelta, 'hmac'> = {
    gameId,
    move: { player, emoji, turn },
    prevChecksum,
    newChecksum,
  };

  const hmac = await generateHMAC(JSON.stringify(delta));

  return { ...delta, hmac };
}

/**
 * Payload structure for delta encoding with embedded target player.
 */
interface DeltaPayload {
  delta: EmojiDelta;
  targetPlayer: 1 | 2;
}

/**
 * Encodes delta into URL hash fragment with embedded target player indicator.
 * The player number is hidden inside the compressed payload.
 *
 * @param delta - The delta to encode
 * @param targetPlayer - Which player this URL is intended for (1 or 2)
 * @returns Hash fragment like "#d=<compressed-payload>" (player embedded, not visible)
 */
export function encodeDelta(delta: EmojiDelta, targetPlayer: 1 | 2): string {
  const payload: DeltaPayload = { delta, targetPlayer };
  const json = JSON.stringify(payload);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#d=${compressed}`;
}

/**
 * Decodes delta from URL hash fragment, extracting embedded target player.
 *
 * @param hashFragment - Hash like "#d=<compressed-payload>"
 * @returns Object with delta and targetPlayer (extracted from payload)
 */
export function decodeDelta(hashFragment: string): { delta: EmojiDelta; targetPlayer: 1 | 2 } {
  const compressed = hashFragment.substring(3); // Remove '#d='
  const json = LZString.decompressFromEncodedURIComponent(compressed);

  if (!json) {
    throw new Error('Failed to decompress delta hash fragment');
  }

  const payload = JSON.parse(json);

  // Handle backward compatibility: old URLs without targetPlayer
  if (payload.targetPlayer === undefined) {
    // Old format: payload is the delta itself
    const delta = payload as EmojiDelta;
    // Infer target player from delta.move.player (opponent of player who made move)
    const targetPlayer = delta.move.player === 1 ? 2 : 1;
    return { delta, targetPlayer };
  }

  // New format: payload has delta and targetPlayer
  if (payload.targetPlayer !== 1 && payload.targetPlayer !== 2) {
    throw new Error('Invalid target player in URL payload');
  }

  return { delta: payload.delta, targetPlayer: payload.targetPlayer };
}

export async function applyDelta(
  currentEmojiChain: string,
  delta: EmojiDelta
): Promise<string> {
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
  const currentChecksum = await calculateChecksum(currentEmojiChain);
  if (currentChecksum !== delta.prevChecksum) {
    throw new Error('Board state mismatch - current state does not match expected previous state');
  }

  // 3. Apply move
  const newChain = currentEmojiChain + delta.move.emoji;

  // 4. Verify result matches expected new state
  const newChecksum = await calculateChecksum(newChain);
  if (newChecksum !== delta.newChecksum) {
    throw new Error('Move application failed - checksum mismatch');
  }

  return newChain;
}
