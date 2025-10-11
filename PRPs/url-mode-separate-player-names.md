---
name: "URL Mode with Separate Player Names"
description: "Fix URL correspondence mode by using separate localStorage keys for player1 and player2"
date: 2025-10-10
---

## Goal

Fix URL correspondence mode by storing player names separately in localStorage, inspired by the working hot-seat mode implementation.

## Why

**Current Problem**:
- URL mode has mysterious localStorage leakage where Player 2's browser shows Player 1's name
- Used single `correspondence-games:player-name` key which caused conflicts
- Player identity unclear when loading URLs

**Why This Matters**:
- URL mode is the core use case for correspondence games (play with friend on different devices)
- Hot-seat mode proved the pattern works with separate player name storage
- Clear player identity improves UX and prevents confusion

**What We Learned from Hot-Seat**:
- Separate `player1-name` and `player2-name` localStorage keys work perfectly
- Game state already includes `player1Name` and `player2Name` fields
- Flow is clear: check localStorage → prompt if missing → continue game

## What (User-Visible Behavior)

### Updated URL Flow

**Player 1 Flow** (Starting new game):
1. Opens app → Mode selection → Choose "URL Mode"
2. Checks localStorage for `player1-name` → prompts if missing
3. Starts new game → adds emoji
4. Gets URL with `player=1` indicator
5. Shares URL with Player 2

**Player 2 Flow** (Receiving URL):
1. Opens URL with `player=2` indicator
2. Checks localStorage for `player2-name` → prompts if missing
3. Loads game state from URL
4. Adds emoji → generates URL with `player=2` indicator
5. Shares URL back to Player 1

**Player 1 Flow** (Receiving URL back):
1. Opens URL with `player=1` indicator
2. Checks localStorage for `player1-name` (already has it)
3. Loads game state → continues playing

### Key Changes from Current Implementation

1. **Separate localStorage Keys**:
   - `correspondence-games:player1-name` (instead of generic `player-name`)
   - `correspondence-games:player2-name` (new)

2. **URL Contains Expected Player**:
   - Full state: `#s=...&p=2` (this URL is for Player 2)
   - Delta: `#d=...&p=1` (this URL is for Player 1)

3. **Smart Name Loading**:
   - URL says "this is for Player 2" → check `player2-name`
   - If null → prompt for name → save to `player2-name`
   - Load game and continue

4. **No More PlayerStorage Class**:
   - Remove old `PlayerStorage` (used single key)
   - URL mode uses same `HotSeatStorage` methods for name management
   - Different storage class for different use cases

## All Needed Context

### Reference Files

**Working Implementation**:
- `packages/core/src/lib/hotseat-storage.ts` - Separate player name storage (WORKS!)
- Test: `packages/core/src/lib/__tests__/hotseat-storage.test.ts` - All 6 tests passing

**Files to Update**:
- `games/emoji-chain/src/App.tsx` - URL loading logic
- `packages/core/src/lib/url-encoder.ts` - Add player parameter to encoding
- `packages/core/src/lib/delta.ts` - Add player parameter to delta

**Files to Remove/Deprecate**:
- `packages/core/src/lib/player-storage.ts` - Old single-name storage (causes problems)

### Current URL Encoding Format

**Full State** (from `url-encoder.ts:20-30`):
```typescript
export function encodeFullState(state: EmojiGameState): string {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(state));
  return `#s=${compressed}`;
}

export function decodeFullState(hashFragment: string): EmojiGameState {
  const compressed = hashFragment.substring(3); // Remove '#s='
  const json = LZString.decompressFromEncodedURIComponent(compressed);
  return EmojiGameStateSchema.parse(JSON.parse(json!));
}
```

**Delta** (from `delta.ts:66-75`):
```typescript
export function encodeDelta(delta: EmojiDelta): string {
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(delta));
  return `#d=${compressed}`;
}

export function decodeDelta(hashFragment: string): EmojiDelta {
  const compressed = hashFragment.substring(3); // Remove '#d='
  const json = LZString.decompressFromEncodedURIComponent(compressed);
  return JSON.parse(json!) as EmojiDelta;
}
```

### Proposed URL Format with Player Parameter

**Option 1: Query Parameter Style** (REJECTED - visible in URL):
```
#s=<compressed-state>&p=2  // ❌ Player number visible
#d=<compressed-delta>&p=1  // ❌ Player number visible
```

**Option 2: Combined Prefix** (REJECTED - still visible):
```
#s2=<compressed-state>  // ❌ Player number visible
#d1=<compressed-delta>  // ❌ Player number visible
```

**Option 3: Embedded in Encoded Data** (CHOSEN - completely hidden):
```
#s=<compressed-state-with-player-embedded>
#d=<compressed-delta-with-player-embedded>
```

**How It Works**:
1. Before compression: Add `targetPlayer` field to the JSON
2. Compress entire JSON (including player number)
3. URL looks identical to current format - no visible player indicator
4. On decode: Decompress → extract `targetPlayer` from JSON

**Example**:
```typescript
// Encoding
const payload = { state: gameState, targetPlayer: 2 };
const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
return `#s=${compressed}`;  // No visible player indicator!

// Decoding
const json = LZString.decompressFromEncodedURIComponent(compressed);
const { state, targetPlayer } = JSON.parse(json);  // Player extracted from payload
```

**Recommendation**: Use Option 3 - completely hides player number, no URL changes visible to user

### Current App.tsx URL Loading Logic

From `App.tsx:30-145` - the useEffect that loads from URL:

```typescript
useEffect(() => {
  // Load player name
  const name = playerStorage.getPlayerName(); // ❌ PROBLEM: single key
  setPlayerName(name);

  const loadGameFromHash = async () => {
    const hash = window.location.hash;

    if (hash && hash.startsWith('#s=')) {
      const state = decodeFullState(hash);

      // ❌ PROBLEM: Complex logic trying to figure out player identity
      if (state.player2Name === '' && state.currentPlayer === 2) {
        if (!playerName) {
          return; // Don't load yet
        }
        state.player2Name = playerName;
      }

      gameStorage.saveGameState(state);
      setGameState(state);
    }
  };

  loadGameFromHash();
}, []);
```

**Problem**: Tries to infer player identity from game state instead of explicit indicator.

### Security Considerations

**XSS Protection**:
- Player names still sanitized via `HotSeatStorage.sanitize()` method
- No eval or innerHTML usage
- URL parameters validated (player must be 1 or 2)

**localStorage Isolation**:
- Each player has their own name stored locally
- Names don't leak between players
- Browser's same-origin policy enforced

**URL Tampering**:
- URL says "for Player 2" but user is actually Player 1?
  - No security risk - just UX confusion
  - User can still play, name prompts appropriately
- Checksum still validates game state integrity

## Implementation Blueprint

### Phase 1: Update URL Encoding to Include Player Parameter

**File**: `packages/core/src/lib/url-encoder.ts`

Add player parameter to encoding functions:

```typescript
/**
 * Payload structure for full state encoding with embedded target player.
 */
interface FullStatePayload {
  state: EmojiGameState;
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
export function encodeFullState(state: EmojiGameState, targetPlayer: 1 | 2): string {
  const payload: FullStatePayload = { state, targetPlayer };
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
  return `#s=${compressed}`;
}

/**
 * Decodes full game state from URL hash fragment, extracting embedded target player.
 *
 * @param hashFragment - Hash like "#s=<compressed-payload>"
 * @returns Object with state and targetPlayer (extracted from payload)
 */
export function decodeFullState(hashFragment: string): { state: EmojiGameState; targetPlayer: 1 | 2 } {
  const compressed = hashFragment.substring(3); // Remove '#s='

  const json = LZString.decompressFromEncodedURIComponent(compressed);
  if (!json) {
    throw new Error('Failed to decompress state from hash fragment');
  }

  const payload = JSON.parse(json);

  // Handle backward compatibility: old URLs without targetPlayer
  if (payload.targetPlayer === undefined) {
    // Old format: payload is the state itself
    const state = EmojiGameStateSchema.parse(payload);
    // Infer target player from currentPlayer (best guess for migration)
    const targetPlayer = state.currentPlayer;
    return { state, targetPlayer };
  }

  // New format: payload has state and targetPlayer
  if (payload.targetPlayer !== 1 && payload.targetPlayer !== 2) {
    throw new Error('Invalid target player in URL payload');
  }

  const state = EmojiGameStateSchema.parse(payload.state);
  return { state, targetPlayer: payload.targetPlayer };
}
```

**Tests to Add** (TDD):
```typescript
it('should encode full state with target player', () => {
  const state: EmojiGameState = {
    gameId: '123',
    emojiChain: '🎮',
    currentTurn: 1,
    currentPlayer: 2,
    player1Name: 'Alice',
    player2Name: 'Bob',
    checksum: 'abc',
  };

  const hash = encodeFullState(state, 2);
  expect(hash).toMatch(/^#s=.+&p=2$/);
});

it('should decode full state with target player', () => {
  const state: EmojiGameState = { /* ... */ };
  const hash = encodeFullState(state, 2);
  const { state: decoded, targetPlayer } = decodeFullState(hash);

  expect(decoded).toEqual(state);
  expect(targetPlayer).toBe(2);
});

it('should throw error for invalid player parameter', () => {
  expect(() => decodeFullState('#s=abc&p=3')).toThrow('Invalid player parameter');
});
```

### Phase 2: Update Delta Encoding Similarly

**File**: `packages/core/src/lib/delta.ts`

```typescript
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
  const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload));
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
    throw new Error('Failed to decompress delta from hash fragment');
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
```

### Phase 3: Update App.tsx to Use Separate Player Names

**Update useEffect** (URL loading):

```typescript
useEffect(() => {
  const loadGameFromHash = async () => {
    const hash = window.location.hash;

    if (hash && hash.startsWith('#s=')) {
      try {
        const { state, targetPlayer } = decodeFullState(hash);

        // Check localStorage for this player's name
        const myName = targetPlayer === 1
          ? hotSeatStorage.getPlayer1Name()
          : hotSeatStorage.getPlayer2Name();

        if (!myName) {
          // Save state to load after name is set
          setPendingGameState(state);
          setPendingTargetPlayer(targetPlayer);
          return; // Name prompt will show
        }

        // Set player names in React state
        if (targetPlayer === 1) {
          setPlayer1Name(myName);
        } else {
          setPlayer2Name(myName);
        }

        // Load game
        gameStorage.saveGameState(state);
        setGameState(state);
      } catch (error) {
        console.error('Failed to load game from URL:', error);
        alert('Failed to load game from URL');
      }
    } else if (hash && hash.startsWith('#d=')) {
      try {
        const { delta, targetPlayer } = decodeDelta(hash);

        // Check localStorage for this player's name
        const myName = targetPlayer === 1
          ? hotSeatStorage.getPlayer1Name()
          : hotSeatStorage.getPlayer2Name();

        if (!myName) {
          // Can't apply delta without name - prompt
          setPendingDelta(delta);
          setPendingTargetPlayer(targetPlayer);
          return;
        }

        // Load previous state from localStorage
        const previousState = gameStorage.getGameState(delta.gameId);

        if (!previousState) {
          alert('Cannot load game. Please request a full state URL from your opponent.');
          return;
        }

        // Validate and apply delta (existing logic)
        // ...
      } catch (error) {
        console.error('Failed to apply delta:', error);
      }
    }
  };

  loadGameFromHash();
  window.addEventListener('hashchange', loadGameFromHash);
  return () => window.removeEventListener('hashchange', loadGameFromHash);
}, []);
```

**Update handleAddEmoji** (URL generation):

```typescript
const handleAddEmoji = async () => {
  if (!gameState) return;

  const newChain = gameState.emojiChain + selectedEmoji;
  const newChecksum = await calculateChecksum(newChain);
  const newTurn = gameState.currentTurn + 1;
  const newPlayer = gameState.currentPlayer === 1 ? 2 : 1;

  const newState: EmojiGameState = {
    ...gameState,
    emojiChain: newChain,
    currentTurn: newTurn,
    currentPlayer: newPlayer,
    checksum: newChecksum,
  };

  setGameState(newState);

  if (gameMode === 'hotseat') {
    hotSeatStorage.saveHotSeatGame(newState);
  } else if (gameMode === 'url') {
    gameStorage.saveGameState(newState);

    // Generate URL for opponent (newPlayer)
    const targetPlayer = newPlayer;
    let url: string;

    if (newTurn === 1) {
      // First move: full state
      const hash = encodeFullState(newState, targetPlayer);
      url = `${window.location.origin}${window.location.pathname}${hash}`;
    } else {
      // Subsequent moves: delta
      const delta = await createDelta(
        gameState.gameId,
        selectedEmoji,
        gameState.currentPlayer,
        newTurn,
        gameState.checksum,
        newChecksum
      );
      const hash = encodeDelta(delta, targetPlayer);
      url = `${window.location.origin}${window.location.pathname}${hash}`;
    }

    setShareUrl(url);
  }
};
```

**Add name prompt screen for URL mode**:

```typescript
// URL mode: Player name check based on URL target
if (gameMode === 'url' && pendingTargetPlayer && !getCurrentPlayerName()) {
  const playerNum = pendingTargetPlayer;
  const savedName = playerNum === 1
    ? hotSeatStorage.getPlayer1Name()
    : hotSeatStorage.getPlayer2Name();

  return (
    <div className="container">
      <h1>🎮 Emoji Chain Game</h1>
      <h2>Player {playerNum}</h2>
      {savedName ? (
        <>
          <p>Your name is: <strong>{savedName}</strong></p>
          <button onClick={() => {
            if (playerNum === 1) {
              setPlayer1Name(savedName);
            } else {
              setPlayer2Name(savedName);
            }
            // Load pending game state
            loadPendingGame();
          }}>
            Continue
          </button>
          <button onClick={() => {
            const newName = prompt('Enter new name:');
            if (newName) {
              if (playerNum === 1) {
                hotSeatStorage.setPlayer1Name(newName);
                setPlayer1Name(newName);
              } else {
                hotSeatStorage.setPlayer2Name(newName);
                setPlayer2Name(newName);
              }
              loadPendingGame();
            }
          }}>
            Change Name
          </button>
        </>
      ) : (
        <>
          <p>Enter your name:</p>
          <button onClick={() => {
            const name = prompt('Enter your name:');
            if (name) {
              if (playerNum === 1) {
                hotSeatStorage.setPlayer1Name(name);
                setPlayer1Name(name);
              } else {
                hotSeatStorage.setPlayer2Name(name);
                setPlayer2Name(name);
              }
              loadPendingGame();
            }
          }}>
            Set Name
          </button>
        </>
      )}
    </div>
  );
}
```

### Phase 4: Remove Old PlayerStorage

**Files to Update**:
1. Remove import from `App.tsx`: `import { PlayerStorage } from '...'`
2. Remove `const playerStorage = new PlayerStorage();`
3. Update all references to use `hotSeatStorage` methods instead
4. Mark `player-storage.ts` as deprecated (or delete if no other packages use it)

**Migration for Existing Users**:
- Old `correspondence-games:player-name` key ignored
- Users prompted for name again (one-time inconvenience)
- New keys prevent localStorage conflicts

### Phase 5: Update Tests

**Files to Update**:
- `packages/core/src/lib/__tests__/url-encoder.test.ts` - Add targetPlayer tests
- `packages/core/src/lib/__tests__/delta.test.ts` - Add targetPlayer tests

**Test Coverage**:
- ✅ Encode/decode with player 1
- ✅ Encode/decode with player 2
- ✅ Invalid player parameter throws error
- ✅ Backward compatibility (old URLs without &p= parameter)

## Validation Loop

### Level 1: Unit Tests

```bash
cd packages/core
npm test -- url-encoder.test.ts
npm test -- delta.test.ts
```

**Expected**:
- ✅ All encoding tests pass with player parameter
- ✅ Decoding validates player is 1 or 2
- ✅ Error handling for malformed URLs

### Level 2: Integration Tests (Manual)

**Test Case 1: New Game with Separate Players**

1. Open browser (Player 1) → Choose URL mode
2. Enter name "Alice" → saved to `player1-name`
3. Start game → add emoji 🎮
4. Copy URL (should have `&p=2`)
5. Open private browser (Player 2)
6. Paste URL → prompted for name
7. Enter "Bob" → saved to `player2-name`
8. See 🎮 chain → add 🎯
9. Copy URL (should have `&p=1`)
10. Back to Player 1 browser
11. Paste URL → sees 🎮🎯 (no name prompt, uses saved "Alice")

**Expected**:
- ✅ Player 1 localStorage: `player1-name=Alice`, `player2-name=null`
- ✅ Player 2 localStorage: `player1-name=null`, `player2-name=Bob`
- ✅ No name leakage between browsers
- ✅ Names persist across page reloads

**Test Case 2: Delta URLs**

1. Continue from Test Case 1
2. Player 1 adds 🎲 → URL has `#d=...&p=2`
3. Player 2 loads URL → delta applied correctly
4. Player 2's localStorage has previous game state
5. Player 2 adds 🎪 → URL has `#d=...&p=1`
6. Player 1 loads URL → delta applied correctly

**Expected**:
- ✅ Delta URLs work for both players
- ✅ Checksums validate correctly
- ✅ State persists in both localStorage instances

### Level 3: Regression Tests

**Test Case 3: Hot-Seat Mode Still Works**

1. Open fresh browser
2. Choose Hot-Seat mode
3. Play through full cycle (P1 → P2 → P1)

**Expected**:
- ✅ Hot-seat mode unaffected
- ✅ Names stored in same keys but different flow
- ✅ No interference with URL mode

## Success Criteria

- [ ] URL encoding includes `&p={1|2}` parameter
- [ ] Delta encoding includes `&p={1|2}` parameter
- [ ] Player 1 uses `player1-name` localStorage key
- [ ] Player 2 uses `player2-name` localStorage key
- [ ] No localStorage leakage between private browsers
- [ ] Name prompts work correctly for each player
- [ ] Delta URLs work with separate player names
- [ ] Full state URLs work with separate player names
- [ ] Hot-seat mode still works (no regression)
- [ ] All unit tests passing
- [ ] Manual integration tests passing

## TDD Task Breakdown

### URL Encoder Updates (TDD)
1. [ ] Write test: encode full state with targetPlayer=1
2. [ ] Write test: encode full state with targetPlayer=2
3. [ ] Write test: decode full state extracts targetPlayer
4. [ ] Write test: invalid player parameter throws error
5. [ ] Implement: update encodeFullState signature
6. [ ] Implement: update decodeFullState to parse &p= parameter
7. [ ] Run tests → GREEN

### Delta Updates (TDD)
8. [ ] Write test: encode delta with targetPlayer
9. [ ] Write test: decode delta extracts targetPlayer
10. [ ] Implement: update encodeDelta signature
11. [ ] Implement: update decodeDelta to parse &p= parameter
12. [ ] Run tests → GREEN

### App.tsx Integration
13. [ ] Add pendingGameState and pendingTargetPlayer state
14. [ ] Update useEffect to use hotSeatStorage for names
15. [ ] Add URL mode name prompt screen
16. [ ] Update handleAddEmoji to include targetPlayer in URLs
17. [ ] Remove PlayerStorage imports and usage
18. [ ] Test URL mode flow manually

### Cleanup
19. [ ] Mark player-storage.ts as deprecated
20. [ ] Update documentation
21. [ ] Run all tests (core + emoji-chain)
22. [ ] Manual integration testing (both modes)

## Timeline Estimate

- **Phase 1** (URL encoder TDD): 45 minutes
- **Phase 2** (Delta encoder TDD): 30 minutes
- **Phase 3** (App.tsx integration): 1 hour
- **Phase 4** (Cleanup): 15 minutes
- **Phase 5** (Testing): 45 minutes
- **Total**: ~3 hours

## Next Steps

Ready to start Phase 1: Update URL encoding with player parameter using TDD? 🚀

This will finally fix the localStorage mystery by explicitly tracking which player each URL is intended for!
