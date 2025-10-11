---
name: "Emoji Game - URL State Management with Delta Encoding"
description: "Minimal game to test URL state encoding, delta compression, and checksum verification"
---

## Game Concept: Emoji Chain

**Simple mechanic**: Players take turns sending emojis. Each turn adds one emoji to a growing chain.

Example gameplay:
```
Player 1: 🎮
Player 2: 🎮🎯
Player 1: 🎮🎯🎲
Player 2: 🎮🎯🎲🎪
```

## Why This Game is Perfect for Testing

1. **Minimal logic** - No win conditions, just append emoji
2. **Clear state** - Just a string of emojis
3. **Delta obvious** - Each turn adds exactly one emoji
4. **Checksum testable** - Easy to verify string integrity
5. **URL compression matters** - String grows with each turn

## Pattern from Tic-Tac-Toe Analysis

### CRITICAL: Hash Fragments (#) Not Query Strings (?)

**Why hash fragments are mandatory**:
- Hash fragments are NOT sent to servers (client-side only)
- Better privacy - game state never leaves the browser
- No server logs of game state
- Reduces server load (no processing needed)
- Consistent with framework-considerations.md guidance

**Reference**: `/home/ryankhetlyr/Development/correspondence-games-framework/framework-considerations.md` (lines 18-22)

**JavaScript API differences**:
```javascript
// Query strings (?):
new URLSearchParams(window.location.search)  // ✗ Don't use

// Hash fragments (#):
window.location.hash                         // ✓ Use this!
window.location.hash.substring(1)            // Remove leading '#'
```

### Delta Encoding Strategy
```
First Move: #s=<full_state>  (Player 2 needs full context) ← # not ?
Later Moves: #d=<delta>       (70-80% smaller!)            ← # not ?
```

### Delta Structure
```typescript
interface URLDelta {
  gameId: string;
  move: {
    player: 1 | 2;
    emoji: string;      // The single emoji added
    turn: number;
  };
  prevChecksum: string;  // SHA-256 of state BEFORE move
  newChecksum: string;   // SHA-256 of state AFTER move
  hmac: string;          // Tamper detection
}
```

### localStorage Strategy
```
ttt-base-{gameId}              → Full game state (for delta reconstruction)
ttt-checksum-{gameId}-t{turn}  → Checksum for each turn (for next delta)
```

## BDD Scenarios for Emoji Game

### Scenario 1: First Move (Full State URL with Hash Fragment)
```gherkin
Given I am Player 1 starting a new game
When I select emoji 🎮 and click "Send to Player 2"
Then the URL should contain hash fragment #s=<compressed_full_state>
And window.location.hash should start with "#s="
And the hash fragment should NOT be sent to any server
And the URL should decode back to the emoji chain "🎮"
And localStorage should store the base state
And localStorage should store checksum for turn 1
```

### Scenario 2: Second Move (Delta URL with Hash Fragment)
```gherkin
Given I am Player 2 receiving the first move URL
And I have emoji chain "🎮" from window.location.hash
When I add emoji 🎯 and click "Send to Player 1"
Then the URL should contain hash fragment #d=<compressed_delta>
And window.location.hash should start with "#d="
And the delta should include:
  - move: { player: 2, emoji: "🎯", turn: 2 }
  - prevChecksum: <checksum of "🎮">
  - newChecksum: <checksum of "🎮🎯">
  - hmac: <tamper detection>
And the URL should be 70-80% smaller than full state
```

### Scenario 3: Delta Verification Failure
```gherkin
Given I have emoji chain "🎮🎯🎲"
When I receive a delta URL expecting prevChecksum of "🎮🎯"
Then the delta should be rejected
And I should see error "Board state mismatch"
```

### Scenario 4: HMAC Tamper Detection
```gherkin
Given I receive a delta URL
When the delta's HMAC doesn't match the content
Then the delta should be rejected
And I should see error "URL has been tampered with"
```

## TDD Implementation Plan

### Phase 1: State Schema & Validation (Zod)
```typescript
// emoji-game-schema.ts
import { z } from 'zod';

const EmojiGameStateSchema = z.object({
  gameId: z.string().uuid(),
  emojiChain: z.string(),           // The full emoji string
  currentTurn: z.number().int().min(1),
  currentPlayer: z.union([z.literal(1), z.literal(2)]),
  checksum: z.string(),              // SHA-256 of emojiChain
});

type EmojiGameState = z.infer<typeof EmojiGameStateSchema>;
```

**First Test**: Schema validation
```typescript
it('should validate valid emoji game state', () => {
  const state = {
    gameId: crypto.randomUUID(),
    emojiChain: '🎮',
    currentTurn: 1,
    currentPlayer: 1,
    checksum: 'abc123...',
  };

  expect(() => EmojiGameStateSchema.parse(state)).not.toThrow();
});
```

### Phase 2: Checksum Calculation
```typescript
// checksum.ts
async function calculateChecksum(emojiChain: string): Promise<string> {
  const canonical = JSON.stringify({ emojiChain });
  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
```

**First Test**: Checksum generation
```typescript
it('should generate consistent SHA-256 checksum', async () => {
  const checksum1 = await calculateChecksum('🎮');
  const checksum2 = await calculateChecksum('🎮');
  expect(checksum1).toBe(checksum2);
  expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
});
```

### Phase 3: URL Encoding (Full State with Hash Fragment)
```typescript
// url-encoder.ts
function encodeFullState(state: EmojiGameState): string {
  const json = JSON.stringify(state);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#s=${compressed}`;  // Hash fragment, not query string!
}
```

**First Test**: Full state encoding with hash fragment
```typescript
it('should encode emoji game state to hash fragment', () => {
  const state: EmojiGameState = {
    gameId: 'test-123',
    emojiChain: '🎮',
    currentTurn: 1,
    currentPlayer: 1,
    checksum: 'abc123',
  };

  const hashFragment = encodeFullState(state);
  expect(hashFragment).toStartWith('#s=');  // Hash, not query!
  expect(hashFragment.length).toBeLessThan(2000);
});
```

### Phase 4: URL Decoding (Full State from Hash Fragment)
```typescript
function decodeFullState(hashFragment: string): EmojiGameState {
  const compressed = hashFragment.substring(3); // Remove '#s='
  const json = LZString.decompressFromEncodedURIComponent(compressed);
  if (!json) throw new Error('Decompression failed');

  const parsed = JSON.parse(json);
  return EmojiGameStateSchema.parse(parsed); // Zod validation!
}
```

**First Test**: Full state round-trip
```typescript
it('should round-trip emoji state through URL encoding', () => {
  const original: EmojiGameState = {
    gameId: 'test-123',
    emojiChain: '🎮🎯',
    currentTurn: 2,
    currentPlayer: 2,
    checksum: 'xyz789',
  };

  const encoded = encodeFullState(original);
  const decoded = decodeFullState(encoded);

  expect(decoded).toEqual(original);
});
```

### Phase 5: Delta Creation
```typescript
interface EmojiDelta {
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

function createDelta(
  gameId: string,
  emoji: string,
  player: 1 | 2,
  turn: number,
  prevChecksum: string,
  newChecksum: string
): EmojiDelta {
  const delta = { gameId, move: { player, emoji, turn }, prevChecksum, newChecksum };
  const hmac = generateHMAC(JSON.stringify(delta));
  return { ...delta, hmac };
}
```

**First Test**: Delta creation
```typescript
it('should create delta with move and checksums', () => {
  const delta = createDelta(
    'game-123',
    '🎯',
    2,
    2,
    'checksum-turn-1',
    'checksum-turn-2'
  );

  expect(delta.move.emoji).toBe('🎯');
  expect(delta.prevChecksum).toBe('checksum-turn-1');
  expect(delta.newChecksum).toBe('checksum-turn-2');
  expect(delta.hmac).toBeDefined();
});
```

### Phase 6: Delta Encoding (Hash Fragment)
```typescript
function encodeDelta(delta: EmojiDelta): string {
  const json = JSON.stringify(delta);
  const compressed = LZString.compressToEncodedURIComponent(json);
  return `#d=${compressed}`;  // Hash fragment, not query!
}
```

**First Test**: Delta size comparison
```typescript
it('should produce smaller URL than full state', () => {
  const fullState: EmojiGameState = {
    gameId: 'test-123',
    emojiChain: '🎮🎯🎲🎪🎨',
    currentTurn: 5,
    currentPlayer: 1,
    checksum: 'abc123',
  };

  const delta: EmojiDelta = {
    gameId: 'test-123',
    move: { player: 1, emoji: '🎨', turn: 5 },
    prevChecksum: 'prev123',
    newChecksum: 'new123',
    hmac: 'hmac123',
  };

  const fullURL = encodeFullState(fullState);
  const deltaURL = encodeDelta(delta);

  expect(deltaURL.length).toBeLessThan(fullURL.length * 0.3); // 70%+ reduction
});
```

### Phase 7: Delta Application with Verification
```typescript
async function applyDelta(
  currentEmojiChain: string,
  delta: EmojiDelta
): Promise<string> {
  // 1. Verify HMAC
  const expectedHmac = generateHMAC(JSON.stringify({
    gameId: delta.gameId,
    move: delta.move,
    prevChecksum: delta.prevChecksum,
    newChecksum: delta.newChecksum,
  }));

  if (delta.hmac !== expectedHmac) {
    throw new Error('URL has been tampered with');
  }

  // 2. Verify current state checksum
  const currentChecksum = await calculateChecksum(currentEmojiChain);
  if (currentChecksum !== delta.prevChecksum) {
    throw new Error('Board state mismatch');
  }

  // 3. Apply move
  const newChain = currentEmojiChain + delta.move.emoji;

  // 4. Verify result checksum
  const newChecksum = await calculateChecksum(newChain);
  if (newChecksum !== delta.newChecksum) {
    throw new Error('Move application failed - checksum mismatch');
  }

  return newChain;
}
```

**First Test**: Delta application success
```typescript
it('should apply valid delta to emoji chain', async () => {
  const currentChain = '🎮';
  const currentChecksum = await calculateChecksum(currentChain);
  const newChain = '🎮🎯';
  const newChecksum = await calculateChecksum(newChain);

  const delta = createDelta('game-123', '🎯', 2, 2, currentChecksum, newChecksum);

  const result = await applyDelta(currentChain, delta);
  expect(result).toBe('🎮🎯');
});

it('should reject delta with wrong prevChecksum', async () => {
  const currentChain = '🎮🎲'; // Wrong state!
  const delta = createDelta('game-123', '🎯', 2, 2, 'wrong-checksum', 'new-checksum');

  await expect(applyDelta(currentChain, delta)).rejects.toThrow('Board state mismatch');
});
```

## Key Differences from PlayerStorage

1. **External validation** - Using Zod for schema validation (MANDATORY for external data)
2. **Async operations** - Checksum calculation uses Web Crypto API
3. **Compression** - Using lz-string for URL compression
4. **Security layers** - HMAC + dual checksum verification
5. **Delta strategy** - Full state first, then deltas only

## Dependencies to Add

```json
{
  "dependencies": {
    "zod": "^3.22.4",
    "lz-string": "^1.5.0"
  }
}
```

## Success Criteria

- [ ] Schema validates emoji game state with Zod
- [ ] Checksum generation is deterministic (SHA-256)
- [ ] Full state encodes/decodes through URL correctly
- [ ] Delta URLs are 70-80% smaller than full state
- [ ] Delta application verifies HMAC + checksums
- [ ] Tampered URLs are rejected
- [ ] State mismatch errors are caught
- [ ] All tests pass with 80%+ coverage

## Next Steps

Start with **Phase 1** - create emoji-game-schema.ts with Zod validation:
1. Write failing test for schema validation
2. Implement minimal schema
3. Make test pass
4. Move to Phase 2 (checksum)

---

## Future Iteration: YAML Configuration

**NOTE FOR NEXT ITERATION**: After completing the emoji game proof-of-concept, incorporate YAML-based game configuration to make the framework truly reusable.

**Reference Documents**:
- `PRPs/configurable-game-framework.md` - YAML configuration approach
- `PRPs/configurable-game-framework-prd.md` - Product requirements for configurable framework

**Key Concept**: Games should be defined by YAML config files rather than hardcoded logic:

```yaml
# games/emoji-chain/config.yaml
game:
  name: "Emoji Chain"
  players: 2
  turnBased: true

state:
  emojiChain: string
  currentTurn: number
  currentPlayer: number

moves:
  addEmoji:
    validation:
      - type: notEmpty
      - type: custom
        validator: "isValidEmoji"
```

**Benefits**:
- New games without writing TypeScript
- Declarative game rules
- Automatic state validation
- Shared framework code
- Easy game variations

**Implementation Strategy**:
1. Complete emoji game with hardcoded logic (current phase)
2. Extract common patterns into framework
3. Design YAML schema for game configuration
4. Build config loader and validator
5. Refactor emoji game to use YAML config
6. Create second game (tic-tac-toe) with YAML to validate framework

This follows YAGNI - build concrete first, then extract abstractions based on real patterns discovered during implementation.

---

**This is pure TDD** - each phase builds on the previous, driven by failing tests!
