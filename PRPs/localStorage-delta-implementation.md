---
name: "Add localStorage Persistence for Delta Encoding Support"
description: "Enable delta encoding by persisting game state in localStorage for correspondence games"
date: 2025-10-10
---

## Goal

Enable delta encoding (`#d=`) URLs to work in correspondence games by persisting game state in localStorage, allowing players to receive and apply deltas even after browser reloads.

## Why

**Current Problem**:
- We built delta encoding but disabled it because deltas require previous game state
- When Player 1 receives a `#d=` URL from Player 2, their browser state is cleared
- Delta can't be applied without the previous emoji chain

**Why This Matters**:
- **URL size**: Delta URLs are 70-80% smaller for complex games
- **Privacy**: Smaller URLs = less data in URL bars/history
- **Scalability**: For games with large state (boards, history), deltas are essential
- **Framework goal**: Prove delta encoding works for correspondence games

## What (User-Visible Behavior)

### Before (Full State Only):
```
Turn 1: http://localhost:5173/#s=N4IgbghgTg... (228 chars)
Turn 2: http://localhost:5173/#s=N4IgbghgTg... (235 chars)
Turn 3: http://localhost:5173/#s=N4IgbghgTg... (242 chars)
```

### After (Delta Encoding):
```
Turn 1: http://localhost:5173/#s=N4IgbghgTg... (228 chars) ← Full state
Turn 2: http://localhost:5173/#d=N4IgDghgpg... (180 chars) ← 21% smaller!
Turn 3: http://localhost:5173/#d=N4IgDghgpg... (185 chars) ← 24% smaller!
```

### User Experience Flow:

1. **Player 1 starts game** (no localStorage yet)
   - Makes first move → `#s=` URL generated
   - Game state saved to localStorage: `emoji-game-{gameId}`

2. **Player 2 receives `#s=` URL** (in new tab/browser)
   - Loads full state from URL
   - Game state saved to localStorage: `emoji-game-{gameId}`
   - Makes second move → `#d=` URL generated (delta!)

3. **Player 1 receives `#d=` URL** (closes tab, opens new one)
   - Loads previous state from localStorage using `gameId` from delta
   - Applies delta to previous state
   - Updates localStorage with new state
   - Makes third move → `#d=` URL generated

## All Needed Context

### Reference Documents
- **Original plan**: `PRPs/emoji-game-planning.md` (lines 70-74) - localStorage strategy already outlined
- **Framework considerations**: `framework-considerations.md` - Privacy and security requirements
- **Current implementation**:
  - `packages/core/src/lib/delta.ts` - Delta encoding/decoding already built (lines 66-75: `decodeDelta`)
  - `packages/core/src/lib/player-storage.ts` - Example localStorage pattern with XSS protection
  - `games/emoji-chain/src/App.tsx` (lines 82-88) - Currently disabled delta generation

### localStorage Strategy (from original plan)

**Key pattern**:
```
emoji-game-{gameId} → Full game state (for delta reconstruction)
```

**Storage format**:
```typescript
interface StoredGameState {
  gameId: string;
  emojiChain: string;
  currentTurn: number;
  currentPlayer: 1 | 2;
  checksum: string;
  timestamp: number; // For cleanup
}
```

### Security Considerations

**XSS Protection** (following PlayerStorage pattern):
- Emoji chains are already safe (Unicode characters)
- GameId is UUID (validated by Zod schema)
- No user-generated strings need sanitization

**Storage Cleanup**:
- Games older than 30 days should be auto-cleaned
- Prevent localStorage exhaustion (5-10MB limit)

**Privacy**:
- localStorage is per-origin (can't leak across domains)
- Game state still in URL (localStorage is just cache)
- Users can clear localStorage without breaking games (falls back to full state)

### Critical Gotchas

1. **localStorage quota**: Browsers limit to ~5-10MB per origin
   - Need cleanup strategy for old games
   - Should fail gracefully if quota exceeded

2. **gameId mismatch**: If delta gameId doesn't match localStorage gameId
   - Fall back to requesting full state URL
   - Show user-friendly error message

3. **Checksum mismatch**: If localStorage state doesn't match delta.prevChecksum
   - localStorage state is stale/corrupted
   - Clear localStorage for that game
   - Request full state URL

4. **Safari private mode**: localStorage may not work
   - Catch QuotaExceededError
   - Fall back to full state URLs only

5. **Multiple tabs**: Two tabs with same game could have stale state
   - Use `storage` event to sync across tabs
   - Not critical for MVP (user uses one tab at a time)

### Patterns from Existing Code

**PlayerStorage pattern** (`packages/core/src/lib/player-storage.ts`):
```typescript
export class PlayerStorage {
  private readonly STORAGE_KEY = 'correspondence-games:player-name';

  getPlayerName(): string | null {
    return localStorage.getItem(this.STORAGE_KEY);
  }

  setPlayerName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player name cannot be empty');
    }
    localStorage.setItem(this.STORAGE_KEY, this.sanitize(name));
  }
}
```

**Key takeaways**:
- Use namespaced keys: `correspondence-games:*`
- Validate before storing
- Handle errors gracefully

## Implementation Blueprint

### Phase 1: Create GameStorage Class (TDD)

**Test 1**: Store and retrieve game state
```typescript
it('should store and retrieve game state', () => {
  const storage = new GameStorage();
  const state: EmojiGameState = {
    gameId: crypto.randomUUID(),
    emojiChain: '🎮🎯',
    currentTurn: 2,
    currentPlayer: 2,
    checksum: 'abc123',
  };

  storage.saveGameState(state);
  const retrieved = storage.getGameState(state.gameId);

  expect(retrieved).toEqual(state);
});
```

**Test 2**: Return null for non-existent game
```typescript
it('should return null for non-existent game', () => {
  const storage = new GameStorage();
  const retrieved = storage.getGameState('non-existent-game-id');

  expect(retrieved).toBeNull();
});
```

**Test 3**: Clean up old games (30+ days)
```typescript
it('should clean up games older than 30 days', () => {
  const storage = new GameStorage();

  // Create old game (31 days ago)
  const oldState = createGameState();
  const oldTimestamp = Date.now() - (31 * 24 * 60 * 60 * 1000);
  localStorage.setItem(
    `correspondence-games:game:${oldState.gameId}`,
    JSON.stringify({ ...oldState, timestamp: oldTimestamp })
  );

  storage.cleanupOldGames();

  expect(storage.getGameState(oldState.gameId)).toBeNull();
});
```

**Implementation**:
```typescript
// packages/core/src/lib/game-storage.ts
import { EmojiGameState, EmojiGameStateSchema } from './emoji-game-schema';

const STORAGE_PREFIX = 'correspondence-games:game:';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface StoredGameState extends EmojiGameState {
  timestamp: number;
}

export class GameStorage {
  saveGameState(state: EmojiGameState): void {
    const key = `${STORAGE_PREFIX}${state.gameId}`;
    const stored: StoredGameState = {
      ...state,
      timestamp: Date.now(),
    };

    try {
      localStorage.setItem(key, JSON.stringify(stored));
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, cleaning up old games');
        this.cleanupOldGames();
        // Try again after cleanup
        localStorage.setItem(key, JSON.stringify(stored));
      } else {
        throw error;
      }
    }
  }

  getGameState(gameId: string): EmojiGameState | null {
    const key = `${STORAGE_PREFIX}${gameId}`;
    const item = localStorage.getItem(key);

    if (!item) return null;

    try {
      const stored: StoredGameState = JSON.parse(item);
      const { timestamp, ...state } = stored;

      // Validate with Zod
      return EmojiGameStateSchema.parse(state);
    } catch (error) {
      console.error('Failed to parse stored game state:', error);
      // Clean up corrupted data
      localStorage.removeItem(key);
      return null;
    }
  }

  cleanupOldGames(): void {
    const now = Date.now();
    const keys = Object.keys(localStorage).filter(k => k.startsWith(STORAGE_PREFIX));

    for (const key of keys) {
      try {
        const item = localStorage.getItem(key);
        if (!item) continue;

        const stored: StoredGameState = JSON.parse(item);
        if (now - stored.timestamp > MAX_AGE_MS) {
          localStorage.removeItem(key);
        }
      } catch (error) {
        // Clean up corrupted data
        localStorage.removeItem(key);
      }
    }
  }
}
```

### Phase 2: Update App.tsx to Use GameStorage

**Changes needed in `games/emoji-chain/src/App.tsx`**:

1. **Import GameStorage** (line 2):
```typescript
import { GameStorage } from '@correspondence-games/core/src/lib/game-storage';
```

2. **Add GameStorage instance** (line 18):
```typescript
const gameStorage = new GameStorage();
```

3. **Update useEffect to handle deltas** (lines 20-50):
```typescript
useEffect(() => {
  // Load player name
  const name = playerStorage.getPlayerName();
  setPlayerName(name);

  // Load game from URL hash
  const loadGameFromHash = async () => {
    const hash = window.location.hash;
    console.log('Loading game from hash:', hash);

    if (hash && hash.startsWith('#s=')) {
      try {
        // Full state encoding - always works
        const state = decodeFullState(hash);
        console.log('Decoded full game state:', state);

        // Save to localStorage for future delta application
        gameStorage.saveGameState(state);
        setGameState(state);
      } catch (error) {
        console.error('Failed to load game from URL:', error);
      }
    } else if (hash && hash.startsWith('#d=')) {
      try {
        // Delta encoding - requires previous state from localStorage
        const delta = decodeDelta(hash);
        console.log('Decoded delta:', delta);

        // Load previous state from localStorage
        const previousState = gameStorage.getGameState(delta.gameId);

        if (!previousState) {
          console.error('Cannot apply delta: no previous state in localStorage for gameId:', delta.gameId);
          alert('Cannot load game. Please request a full state URL from your opponent.');
          return;
        }

        // Apply delta to previous state
        const newChain = await applyDelta(previousState.emojiChain, delta);

        // Create new state
        const newState: EmojiGameState = {
          gameId: delta.gameId,
          emojiChain: newChain,
          currentTurn: delta.move.turn,
          currentPlayer: delta.move.player === 1 ? 2 : 1, // Switch player
          checksum: delta.newChecksum,
        };

        console.log('Applied delta, new state:', newState);

        // Save to localStorage
        gameStorage.saveGameState(newState);
        setGameState(newState);
      } catch (error) {
        console.error('Failed to apply delta:', error);
        alert(`Failed to load game: ${error.message}\nPlease request a full state URL.`);
      }
    }
  };

  // Load on mount
  loadGameFromHash();

  // Listen for hash changes
  window.addEventListener('hashchange', loadGameFromHash);

  return () => {
    window.removeEventListener('hashchange', loadGameFromHash);
  };
}, []);
```

4. **Re-enable delta generation in handleAddEmoji** (lines 80-100):
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

  // Save to localStorage
  gameStorage.saveGameState(newState);
  setGameState(newState);

  // Generate shareable URL
  let url: string;
  if (newTurn === 1) {
    // First move: full state (opponent needs everything)
    const hash = encodeFullState(newState);
    url = `${window.location.origin}${window.location.pathname}${hash}`;
  } else {
    // Subsequent moves: delta (opponent has localStorage)
    const delta = await createDelta(
      gameState.gameId,
      selectedEmoji,
      gameState.currentPlayer,
      newTurn,
      gameState.checksum,
      newChecksum
    );
    const hash = encodeDelta(delta);
    url = `${window.location.origin}${window.location.pathname}${hash}`;
  }

  setShareUrl(url);
};
```

5. **Re-enable delta display** (line 147):
```typescript
<p>URL Type: {shareUrl.includes('#s=') ? 'Full State' : 'Delta (compact!)'}</p>
```

6. **Add import for applyDelta and createDelta** (line 5):
```typescript
import { createDelta, encodeDelta, decodeDelta, applyDelta } from '@correspondence-games/core/src/lib/delta';
```

### Phase 3: Add Cleanup Button (Nice-to-Have)

Add button to manually trigger cleanup (useful for development):

```typescript
const handleCleanupStorage = () => {
  gameStorage.cleanupOldGames();
  alert('Cleaned up old games from localStorage');
};

// In render:
<button onClick={handleCleanupStorage}>Clean Up Old Games</button>
```

## Validation Loop

### Level 1: Unit Tests (packages/core)
```bash
cd packages/core
npm test -- game-storage.test.ts
```

**Expected**: All GameStorage tests pass (save, retrieve, cleanup, quota handling)

### Level 2: Integration Tests (games/emoji-chain)
```bash
cd games/emoji-chain
npm run build
```

**Expected**: No TypeScript errors, build succeeds

### Level 3: Manual Browser Testing

**Test Case 1: First move (full state)**
1. Open `http://localhost:5173`
2. Set player name
3. Start new game
4. Add emoji
5. Check: URL has `#s=`, localStorage has game state
6. Open DevTools → Application → Local Storage → verify key exists

**Test Case 2: Second move (delta generation)**
1. Continue from Test Case 1
2. Add another emoji
3. Check: URL has `#d=` (not `#s=`!)
4. Verify URL is shorter than previous
5. Check localStorage updated with new state

**Test Case 3: Delta application (reload)**
1. Copy delta URL from Test Case 2
2. Close browser completely
3. Open new browser
4. Set player name (localStorage persists)
5. Paste delta URL
6. Check: Game state loads correctly with both emojis!

**Test Case 4: Missing localStorage (fallback)**
1. Generate delta URL
2. Clear localStorage (DevTools → Application → Clear)
3. Paste delta URL
4. Check: Error message shown, user asked for full state URL

**Test Case 5: Safari private mode (graceful degradation)**
1. Open in Safari Private Mode
2. Try to make moves
3. Check: Falls back to full state URLs, no crashes

## Success Criteria

- [ ] GameStorage class implemented with tests passing
- [ ] Game state persists in localStorage after each move
- [ ] First move generates `#s=` URL (full state)
- [ ] Subsequent moves generate `#d=` URLs (delta)
- [ ] Delta URLs are measurably smaller (log sizes to console)
- [ ] Player can receive delta URL and game loads correctly
- [ ] Missing localStorage shows helpful error message
- [ ] Old games (30+ days) are cleaned up
- [ ] Quota exceeded error handled gracefully
- [ ] TypeScript builds without errors
- [ ] All existing tests still pass
- [ ] Browser testing scenarios complete successfully

## TDD Task Breakdown

1. [ ] Write GameStorage test file (`packages/core/src/lib/__tests__/game-storage.test.ts`)
2. [ ] Write first test: `should store and retrieve game state` (RED)
3. [ ] Implement GameStorage.saveGameState() and .getGameState() (GREEN)
4. [ ] Write test: `should return null for non-existent game` (RED → GREEN)
5. [ ] Write test: `should clean up games older than 30 days` (RED)
6. [ ] Implement GameStorage.cleanupOldGames() (GREEN)
7. [ ] Write test: `should handle QuotaExceededError` (RED)
8. [ ] Implement quota handling in saveGameState() (GREEN)
9. [ ] Refactor: Extract constants, improve error messages
10. [ ] Update App.tsx to import GameStorage
11. [ ] Update useEffect to handle delta URLs with localStorage
12. [ ] Re-enable delta generation in handleAddEmoji
13. [ ] Add console.log statements for debugging
14. [ ] Build and test in browser
15. [ ] Run all validation scenarios
16. [ ] Update README.md with localStorage documentation

## Timeline Estimate

- **Phase 1** (GameStorage TDD): 45 minutes
- **Phase 2** (App.tsx integration): 30 minutes
- **Phase 3** (Browser testing): 30 minutes
- **Total**: ~2 hours

## Next Steps

Start with **Phase 1, Test 1**: Create `game-storage.test.ts` with first failing test for storing/retrieving game state.

Ready to begin? 🚀
