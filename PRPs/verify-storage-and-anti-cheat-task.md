name: "Verify Browser Storage Usage and Implement Anti-Cheat Choice Locking - Task PRP"
description: |
  Audit and enhance browser storage implementation in deployed game instances to ensure
  compliance with framework design and add choice-locking anti-cheat measures.

---

## Goal

**Task Goal**: Verify that games in `correspondence-games-framework/games/` (dilemma, rock-paper-scissors) are using browser storage correctly as specified in the PRD, and implement a simple anti-cheat mechanism using localStorage to prevent players from retrying different choices in the same round.

**Deliverable**:
- Audit report of current storage usage vs. PRD specifications
- Implementation of choice-locking mechanism using localStorage
- Updated game instances with anti-cheat protection
- Documentation of storage patterns and security considerations

**Success Definition**:
1. Current storage implementation is documented and compared to PRD requirements
2. Choice-locking mechanism prevents same-round choice retries
3. All existing game functionality continues to work
4. Clear error messaging for blocked retry attempts
5. Implementation matches "middle of the road" security approach (not foolproof, but reasonable deterrent)
6. **Positive intent UX**: Players who reload URLs after making a choice see their locked choice and URL to share (not choice buttons)

---

## Context

### Current State Analysis

**Framework Design Specifications** (from PRD):
- **localStorage-first architecture**: Full game history stored locally, not in URLs
- **Delta-based URLs**: URLs contain only latest move + checksum (not full state)
- **SHA-256 checksum verification**: Validates entire game history integrity
- **HMAC-signed URLs**: Provides tamper detection for URL-encoded state
- **Security Architecture**: "Defense in depth" with checksums + HMAC + Zod validation

**Actual Implementation in Deployed Games**:

Both `dilemma` and `rock-paper-scissors` games currently use:
- **Simple base64 URL encoding** (`btoa`/`atob`) - NO encryption, NO HMAC
- **Full state in URL hash** - NOT delta-based
- **NO localStorage usage** - All state in URL only
- **NO checksum verification** - URLs can be freely modified
- **Simple flow state tracking** - `waiting_first`, `waiting_second`, `results_and_next`, `complete`

**Gap Analysis**:
```
DESIGNED:                           ACTUAL:
✅ localStorage-first               ❌ No localStorage usage at all
✅ Delta URLs (move only)           ❌ Full state in URL
✅ SHA-256 checksums                ❌ No checksums
✅ HMAC signatures                  ❌ No HMAC (plain base64)
✅ Encryption (AES-256)             ❌ No encryption
✅ Anti-tamper validation           ❌ URLs freely modifiable
```

**Framework Code EXISTS but is UNUSED**:
- `src/framework/storage/checksumManager.ts` - SHA-256 implementation ✓
- `src/framework/storage/hmacManager.ts` - HMAC-SHA256 implementation ✓
- `src/framework/storage/encryption.ts` - AES-256 encryption ✓
- Functions: `saveWithChecksum()`, `loadWithChecksum()`, `generateHMAC()`, `verifyHMAC()`

### Anti-Cheat Requirement

**User's Request**: "Use browser storage as a simple way to make sure players cannot re-try a different choice in the same round as a way to cheat - I know this isn't fool proof but it's a middle of the road that gets us a little of the way there"

**Attack Scenarios to Prevent**:

**Scenario 1: Back Button Time Travel**
1. Player 1 makes a choice (e.g., "cooperate") → URL updates
2. Player 1 sees opponent's choice, regrets their decision
3. **Player 1 hits browser back button** → Returns to pre-choice URL
4. Player 1 tries to choose "defect" instead
5. This allows Player 1 to "time travel" and cheat

**Scenario 2: URL Manipulation**
1. Player 1 makes a choice (e.g., "cooperate")
2. Player 1 generates URL and sends to Player 2
3. Player 2 makes their choice
4. **Player 1 sees URL from Player 2, realizes their choice was suboptimal**
5. **Player 1 modifies URL or clears browser and tries different choice**
6. This allows Player 1 to "time travel" and cheat

**Scenario 3: Page Refresh**
1. Player 1 makes a choice
2. Player 1 refreshes page (hoping to reset)
3. Player 1 tries to make different choice

**Desired Behavior**:
- Once a player makes a choice for round N, that choice is locked in localStorage
- If player tries to change their choice for the same round, show error
- Choice lock persists across:
  - ✅ Page reloads/refreshes
  - ✅ **Back button navigation**
  - ✅ Forward button navigation
  - ✅ URL hash changes
  - ✅ Browser restarts (localStorage persists)
- Choice lock includes: gameId + roundNumber + playerNumber
- Implementation should be "reasonable deterrent" not "Fort Knox"

**How localStorage Blocks Back Button Cheating**:
```
Timeline:
1. URL: #empty → Player chooses "rock" → localStorage: {choice: "rock"}
2. URL: #rock-chosen (browser history entry created)
3. Player hits BACK → URL: #empty (history navigates back)
4. useEffect detects hash change → Re-renders UI for empty state
5. BUT localStorage still has: {round: 1, player: 1, choice: "rock"}
6. UI checks localStorage → Detects lock → Shows locked choice display
7. ✅ Back button is neutralized by localStorage persistence!
```

**Key Insight**: URL state is ephemeral (controlled by browser history), but localStorage state persists. The lock in localStorage "survives" back button navigation.

**URL Re-Loading Behavior** (Positive Intent Assumption):
- If player reloads the URL from the other player AFTER already making their choice:
  - ✅ **Show their locked choice** (not the choice UI)
  - ✅ **Show the URL they need to send** to the other player
  - ✅ **Display the same screen** they saw after making their choice
  - ❌ **Do NOT allow re-choosing** (even with same choice UI visible)
  - 💡 **Assume positive intent**: Player wants to re-send URL or verify their choice

**Example Flow**:
```
1. Player 1 makes choice "cooperate" → Sees "Choice made: cooperate" + URL to share
2. Player 1 sends URL to Player 2
3. Player 2 clicks URL, makes choice "defect" → Generates new URL with both choices
4. Player 1 clicks Player 2's URL (to see result or re-send)
5. ✅ App detects: "I already chose for this round"
6. ✅ App shows: "Your choice: cooperate" + original URL Player 1 sent
7. ❌ App does NOT show: Choice buttons (even though URL shows opponent chose)
```

**Implementation Insight**: You're correct that this behavior may already be implicit in the full PRD-compliant localStorage-first design. The PRD specifies:
- localStorage stores full game state
- URLs contain only deltas (latest move)
- App checks localStorage first, then merges URL delta

If we were to implement the full PRD specification:
1. App loads → Checks localStorage for gameId
2. If found → Loads full state from localStorage (including Player 1's choice)
3. URL only provides Player 2's new move
4. App would naturally show Player 1's locked choice since it's in localStorage

However, current implementation uses full state in URLs with no localStorage, so this behavior must be explicitly implemented via choice locking. Future migration to full PRD spec would make this more natural.

### Pattern Examples

**From PRD - localStorage Lifecycle States**:
```typescript
interface LocalStorageGameRecord {
  metadata: {
    gameId: string;
    gameType: string;
    createdAt: string;
    lastUpdatedAt: string;
  };
  gameState: GenericGameState;
  checksum: string; // SHA-256 of gameState + metadata
}
```

**From security-considerations.md - Turn Number Validation**:
```javascript
// Prevent replay attacks
const lastKnownTurn = this.getLastKnownTurn(state.gameId);
if (lastKnownTurn !== null && state.turnNumber <= lastKnownTurn) {
  throw new Error('Turn number not advancing (replay attack?)');
}
```

**Choice Lock Pattern (New)**:
```typescript
interface ChoiceLock {
  gameId: string;
  round: number;
  player: 1 | 2;
  choiceId: string;
  timestamp: string;
  locked: true;
}
```

---

## All Needed Context

### Documentation & References

```yaml
# Browser Storage APIs
- url: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
  why: localStorage API reference and best practices
  critical: localStorage is synchronous and blocks main thread

- url: https://developer.mozilla.org/en-US/docs/Web/API/Storage
  why: Storage interface methods (setItem, getItem, removeItem)
  critical: localStorage stores strings only - must JSON.stringify/parse

# Framework Implementation Files
- file: src/framework/storage/checksumManager.ts
  why: SHA-256 checksum generation and verification utilities
  pattern: saveWithChecksum(), loadWithChecksum() for integrity
  critical: Already implemented but unused in App.tsx

- file: src/framework/storage/hmacManager.ts
  why: HMAC-SHA256 signature generation for tamper detection
  pattern: signData(), verifySignedData() for URL integrity
  critical: Already implemented but unused in App.tsx

- file: correspondence-games-framework/games/rock-paper-scissors/src/App.tsx
  why: Current implementation using simple base64 encoding
  line: 44-67 (URL loading), 71-76 (URL updating), 97-142 (makeChoice)
  pattern: btoa(JSON.stringify(gameState)) - no security

- file: correspondence-games-framework/games/dilemma/src/App.tsx
  why: Same pattern as rock-paper-scissors (duplicated code)
  pattern: Identical implementation - both need same updates

# PRD Specifications
- file: PRPs/configurable-game-framework-prd.md
  section: "localStorage Data Structures" (lines 478-503)
  why: Defines LocalStorageGameRecord interface and checksum structure
  critical: Full specification not implemented in deployed games

- file: PRPs/configurable-game-framework-prd.md
  section: "localStorage Lifecycle States" (lines 1150-1227)
  why: Game lifecycle management and cleanup strategies
  critical: Defines when games are stored, retrieved, and deleted

- file: correspondence-games-framework/security-considerations.md
  section: "Turn number validation" (lines 156-160)
  why: Pattern for preventing replay attacks using localStorage
  pattern: Store lastKnownTurn, verify incoming turn is greater

# Existing Patterns in Main Repo
- file: src/features/game/hooks/useLocalStorage.ts
  why: Example localStorage hook pattern from original Prisoner's Dilemma
  pattern: Custom React hook for localStorage with TypeScript safety
  critical: Shows hook-based approach vs direct localStorage calls
```

### Known Gotchas & Library Quirks

```typescript
// GOTCHA: localStorage is Synchronous
// Writing large objects blocks UI thread
// Solution: Keep stored data minimal, use compression if needed
localStorage.setItem(key, JSON.stringify(largeObject)); // ❌ Can freeze UI
// Better: Store only essential data

// GOTCHA: localStorage is String-Only
const state = { round: 1, score: 10 };
localStorage.setItem('game', state); // ❌ Stores "[object Object]"
localStorage.setItem('game', JSON.stringify(state)); // ✅ Stores valid JSON

// CRITICAL: localStorage is Per-Origin
// Different games on same domain share storage
// Solution: Always prefix keys with game identifier
localStorage.setItem('game-state', ...); // ❌ Collision risk
localStorage.setItem('rps-game-abc123-state', ...); // ✅ Namespaced

// GOTCHA: localStorage Has Quota (5-10MB)
try {
  localStorage.setItem(key, value);
} catch (e) {
  if (e.name === 'QuotaExceededError') {
    // Handle quota - clear old games
  }
}

// CRITICAL: localStorage is NOT Secure
// Users can edit localStorage in DevTools
// Solution: Use checksums to detect tampering
const data = loadFromLocalStorage();
const checksum = await generateChecksum(data);
if (checksum !== storedChecksum) {
  throw new Error('Data tampered with!');
}

// GOTCHA: JSON.stringify Order Affects Checksums
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 2, a: 1 };
JSON.stringify(obj1) !== JSON.stringify(obj2); // Different strings!
// Solution: Sort object keys before checksum or use canonical JSON

// GOTCHA: React State Updates are Async
const [state, setState] = useState();
setState(newState);
localStorage.setItem('state', JSON.stringify(state)); // ❌ Uses OLD state
// Solution: Use useEffect to sync state -> localStorage
useEffect(() => {
  localStorage.setItem('state', JSON.stringify(gameState));
}, [gameState]);

// CRITICAL: Choice Lock Must Survive Page Refresh
// Player could refresh page to bypass in-memory lock
// Solution: Store lock in localStorage, check on component mount
useEffect(() => {
  const lock = loadChoiceLock(gameId, round, playerNum);
  if (lock && lock.locked) {
    setChoiceLocked(true);
  }
}, []);

// GOTCHA: Multiple Tabs Can Conflict
// Player could open game in 2 tabs and make different choices
// Solution: Use storage event listener to detect cross-tab changes
window.addEventListener('storage', (e) => {
  if (e.key === `choice-lock-${gameId}-${round}`) {
    // Another tab locked a choice - reload lock state
  }
});

// CRITICAL: localStorage Can Fail Silently in Incognito
// Some browsers disable localStorage in private mode
// Solution: Feature detection and graceful fallback
function isLocalStorageAvailable() {
  try {
    localStorage.setItem('test', 'test');
    localStorage.removeItem('test');
    return true;
  } catch {
    return false;
  }
}

// CRITICAL: Back Button with Hash-Based Routing
// Apps using window.location.hash create browser history entries
// Back button navigates through hash history, NOT server pages
// Solution: localStorage persists across hash changes
const hash1 = '#empty-state';
const hash2 = '#choice-made';
window.location.hash = hash2; // Browser history: [hash1, hash2]
// User hits BACK → window.location.hash = hash1
// useEffect detects hash change → Re-renders
// BUT localStorage still has lock → Shows locked choice
// ✅ Back button defeated by localStorage persistence!
```

### Integration Points

**Files to Modify**:
1. `correspondence-games-framework/games/rock-paper-scissors/src/App.tsx`
2. `correspondence-games-framework/games/dilemma/src/App.tsx`

**New Files to Create**:
1. `src/framework/storage/choiceLockManager.ts` - Choice locking utilities
2. `src/framework/hooks/useChoiceLock.ts` - React hook for choice locking

**Functions to Call**:
- `saveWithChecksum()` - From checksumManager.ts (currently unused)
- `loadWithChecksum()` - From checksumManager.ts (currently unused)
- `generateChecksum()` - For verifying localStorage integrity
- New: `lockChoice()`, `isChoiceLocked()`, `getLockedChoice()`, `clearChoiceLocks()`

---

## Implementation Blueprint

### Phase 1: Create Choice Lock Manager

**Objective**: Build reusable choice locking system using localStorage

#### Task 1.1: CREATE `src/framework/storage/choiceLockManager.ts`

```typescript
/**
 * @fileoverview Choice locking system to prevent round-replay cheating
 * @module framework/storage/choiceLockManager
 *
 * Anti-cheat pattern: Once a player makes a choice for a round,
 * that choice is locked in localStorage and cannot be changed.
 *
 * SECURITY LEVEL: "Middle of the road" deterrent
 * - Prevents casual cheating (page refresh to change choice)
 * - Does NOT prevent determined attackers (localStorage is client-controlled)
 * - Relies on localStorage availability (fails gracefully if disabled)
 */

/**
 * Represents a locked choice for a specific round
 */
export interface ChoiceLock {
  gameId: string;
  round: number;
  player: 1 | 2;
  choiceId: string;
  timestamp: string;
  locked: true; // Always true - exists = locked
}

/**
 * Stores a choice lock in localStorage
 *
 * @param gameId - Unique game identifier
 * @param round - Round number (1-indexed)
 * @param player - Player number (1 or 2)
 * @param choiceId - The choice that was made
 *
 * @example
 * lockChoice('game-abc123', 1, 1, 'cooperate');
 */
export function lockChoice(
  gameId: string,
  round: number,
  player: 1 | 2,
  choiceId: string
): void {
  const lock: ChoiceLock = {
    gameId,
    round,
    player,
    choiceId,
    timestamp: new Date().toISOString(),
    locked: true,
  };

  const key = `choice-lock-${gameId}-r${round}-p${player}`;

  try {
    localStorage.setItem(key, JSON.stringify(lock));
  } catch (error) {
    console.warn('Failed to lock choice (localStorage unavailable):', error);
    // Graceful degradation - game continues without lock
  }
}

/**
 * Checks if a choice is locked for this round
 *
 * @returns ChoiceLock if locked, null if not locked
 */
export function getChoiceLock(
  gameId: string,
  round: number,
  player: 1 | 2
): ChoiceLock | null {
  const key = `choice-lock-${gameId}-r${round}-p${player}`;

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return null;

    const lock = JSON.parse(stored) as ChoiceLock;

    // Validate lock structure
    if (!lock.locked || lock.gameId !== gameId || lock.round !== round || lock.player !== player) {
      console.warn('Invalid lock structure - ignoring');
      return null;
    }

    return lock;
  } catch (error) {
    console.warn('Failed to read choice lock:', error);
    return null;
  }
}

/**
 * Checks if a choice is locked for this round
 */
export function isChoiceLocked(
  gameId: string,
  round: number,
  player: 1 | 2
): boolean {
  return getChoiceLock(gameId, round, player) !== null;
}

/**
 * Validates that a new choice matches the locked choice
 *
 * @throws {Error} If choice is locked and doesn't match
 */
export function validateChoice(
  gameId: string,
  round: number,
  player: 1 | 2,
  attemptedChoice: string
): void {
  const lock = getChoiceLock(gameId, round, player);

  if (!lock) {
    // No lock exists - this is the first choice, allow it
    return;
  }

  if (lock.choiceId !== attemptedChoice) {
    throw new Error(
      `Choice locked for round ${round}. You already chose "${lock.choiceId}". ` +
      `You cannot change to "${attemptedChoice}".`
    );
  }

  // Choice matches lock - allow (idempotent operation)
}

/**
 * Clears all choice locks for a game (called when starting new game)
 */
export function clearGameLocks(gameId: string): void {
  try {
    const keys = Object.keys(localStorage);
    const lockKeys = keys.filter(k => k.startsWith(`choice-lock-${gameId}-`));

    lockKeys.forEach(key => localStorage.removeItem(key));
  } catch (error) {
    console.warn('Failed to clear game locks:', error);
  }
}

/**
 * Clears locks older than specified days (cleanup utility)
 */
export function clearOldLocks(maxAgeDays: number = 7): void {
  try {
    const now = Date.now();
    const maxAge = maxAgeDays * 24 * 60 * 60 * 1000;

    const keys = Object.keys(localStorage);
    const lockKeys = keys.filter(k => k.startsWith('choice-lock-'));

    lockKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return;

        const lock = JSON.parse(stored) as ChoiceLock;
        const age = now - new Date(lock.timestamp).getTime();

        if (age > maxAge) {
          localStorage.removeItem(key);
        }
      } catch {
        // Invalid lock - remove it
        localStorage.removeItem(key);
      }
    });
  } catch (error) {
    console.warn('Failed to clear old locks:', error);
  }
}

/**
 * Debug utility - lists all choice locks
 */
export function debugListLocks(): ChoiceLock[] {
  const locks: ChoiceLock[] = [];

  try {
    const keys = Object.keys(localStorage);
    const lockKeys = keys.filter(k => k.startsWith('choice-lock-'));

    lockKeys.forEach(key => {
      try {
        const stored = localStorage.getItem(key);
        if (!stored) return;
        locks.push(JSON.parse(stored) as ChoiceLock);
      } catch {
        // Skip invalid locks
      }
    });
  } catch (error) {
    console.warn('Failed to list locks:', error);
  }

  return locks;
}
```

**VALIDATE**:
```bash
npm run type-check
# Should compile without errors
```

**IF_FAIL**: Check import paths, interface definitions, TypeScript strict mode

**ROLLBACK**: `git checkout src/framework/storage/choiceLockManager.ts`

---

#### Task 1.2: CREATE `src/framework/hooks/useChoiceLock.ts`

```typescript
/**
 * @fileoverview React hook for choice locking
 * @module framework/hooks/useChoiceLock
 */

import { useState, useEffect, useCallback } from 'react';
import {
  lockChoice,
  isChoiceLocked,
  getChoiceLock,
  validateChoice,
  clearGameLocks,
  type ChoiceLock,
} from '../storage/choiceLockManager';

/**
 * Hook return value
 */
interface UseChoiceLockResult {
  /** Whether the choice is locked for this round */
  isLocked: boolean;

  /** The locked choice (if any) */
  lockedChoice: ChoiceLock | null;

  /** Lock a choice for this round */
  lockPlayerChoice: (choiceId: string) => void;

  /** Validate and lock a choice (throws if mismatch) */
  validateAndLock: (choiceId: string) => void;

  /** Clear all locks for this game */
  clearLocks: () => void;
}

/**
 * React hook for managing choice locks
 *
 * @param gameId - Unique game identifier
 * @param round - Current round number
 * @param player - Player number (1 or 2)
 *
 * @example
 * ```tsx
 * function GameComponent() {
 *   const { isLocked, validateAndLock, lockedChoice } = useChoiceLock(gameId, 1, 1);
 *
 *   const handleChoice = (choice: string) => {
 *     try {
 *       validateAndLock(choice);
 *       // Choice is valid and now locked
 *     } catch (error) {
 *       alert(error.message); // "You already chose cooperate"
 *     }
 *   };
 *
 *   return (
 *     <div>
 *       {isLocked && <p>Choice locked: {lockedChoice.choiceId}</p>}
 *       <button onClick={() => handleChoice('cooperate')}>Cooperate</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useChoiceLock(
  gameId: string,
  round: number,
  player: 1 | 2
): UseChoiceLockResult {
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockedChoice, setLockedChoice] = useState<ChoiceLock | null>(null);

  // Check if choice is locked on mount and when dependencies change
  useEffect(() => {
    const lock = getChoiceLock(gameId, round, player);
    setIsLocked(lock !== null);
    setLockedChoice(lock);
  }, [gameId, round, player]);

  // Listen for storage events (cross-tab synchronization)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      const key = `choice-lock-${gameId}-r${round}-p${player}`;
      if (e.key === key) {
        // Lock changed in another tab - reload
        const lock = getChoiceLock(gameId, round, player);
        setIsLocked(lock !== null);
        setLockedChoice(lock);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [gameId, round, player]);

  const lockPlayerChoice = useCallback(
    (choiceId: string) => {
      lockChoice(gameId, round, player, choiceId);
      setIsLocked(true);
      setLockedChoice(getChoiceLock(gameId, round, player));
    },
    [gameId, round, player]
  );

  const validateAndLock = useCallback(
    (choiceId: string) => {
      // Throws if choice doesn't match existing lock
      validateChoice(gameId, round, player, choiceId);

      // If validation passed, lock it (idempotent if already locked)
      lockPlayerChoice(choiceId);
    },
    [gameId, round, player, lockPlayerChoice]
  );

  const clearLocks = useCallback(() => {
    clearGameLocks(gameId);
    setIsLocked(false);
    setLockedChoice(null);
  }, [gameId]);

  return {
    isLocked,
    lockedChoice,
    lockPlayerChoice,
    validateAndLock,
    clearLocks,
  };
}
```

**VALIDATE**:
```bash
npm run type-check
# Should compile without errors
```

**IF_FAIL**: Check React hooks rules, useCallback dependencies

**ROLLBACK**: `git checkout src/framework/hooks/useChoiceLock.ts`

---

### Phase 2: Integrate Choice Locking into Games

**Objective**: Add choice locking to both deployed games

#### Task 2.1: MODIFY `correspondence-games-framework/games/rock-paper-scissors/src/App.tsx`

**CHANGE 1**: Add import for choice lock hook

```typescript
// Add to imports at top of file
import { useChoiceLock } from './framework/hooks/useChoiceLock';
```

**CHANGE 2**: Add choice lock hook to App component

```typescript
function App() {
  const { config, loading, error } = useConfigLoader(rpsConfig);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [urlState, setUrlState] = useState<GameState | null>(null);

  // NEW: Add choice lock hook
  // Determine which player we are based on URL state
  const currentPlayer: 1 | 2 = urlState ? 2 : 1;
  const currentRound = gameState?.currentRound ?? 1;
  const gameId = gameState?.gameId ?? '';

  const {
    isLocked,
    lockedChoice,
    validateAndLock,
    clearLocks
  } = useChoiceLock(gameId, currentRound, currentPlayer);

  // NEW: Check if player already made choice on mount (URL re-load scenario)
  // This also handles back button navigation since hash changes trigger re-render
  useEffect(() => {
    if (gameState && urlState && isLocked && lockedChoice) {
      // Player is re-loading opponent's URL but already made their choice
      // OR player used back button to navigate to previous URL
      // Show them their locked choice instead of allowing new choice
      console.log('Player already made choice:', lockedChoice.choiceId);
    }
  }, [gameState, urlState, isLocked, lockedChoice]);

  // ... rest of component
}
```

**CHANGE 3**: Update `makeChoice` to validate and lock

```typescript
const makeChoice = useCallback((playerNum: 1 | 2, choiceId: string) => {
  if (!gameState || !config) return;

  // NEW: Validate and lock choice BEFORE updating state
  try {
    validateAndLock(choiceId);
  } catch (error) {
    // Choice is locked and doesn't match - show error
    alert(`Cannot change choice: ${(error as Error).message}`);
    return;
  }

  const newState = { ...gameState };

  // ... rest of existing logic (unchanged)
}, [gameState, config, validateAndLock]); // Add validateAndLock to deps
```

**CHANGE 4**: Clear locks when starting new game

```typescript
const startNewGame = useCallback(() => {
  if (!config) return;

  // NEW: Clear locks before starting new game
  if (gameState?.gameId) {
    clearLocks();
  }

  const newGame: GameState = {
    gameId: createGameId(),
    currentRound: 1,
    player1Total: 0,
    player2Total: 0,
    rounds: [],
    flowState: 'waiting_first',
    whoWentFirst: 1,
    pendingResultsForRound: undefined,
  };

  setGameState(newGame);
  setUrlState(null);
  window.location.hash = '';
}, [config, gameState, clearLocks]); // Add deps
```

**CHANGE 5**: Update `makeNextChoiceAfterResults` to validate and lock

```typescript
const makeNextChoiceAfterResults = useCallback((choiceId: string) => {
  if (!gameState || !config) return;

  // NEW: Validate and lock choice for new round
  try {
    validateAndLock(choiceId);
  } catch (error) {
    alert(`Cannot change choice: ${(error as Error).message}`);
    return;
  }

  const newState = { ...gameState };

  // ... rest of existing logic (unchanged)
}, [gameState, config, validateAndLock]); // Add validateAndLock to deps
```

**CHANGE 6**: Add UI logic for locked choice display (REQUIRED for positive intent UX)

```typescript
// In the render section - REPLACE choice buttons with locked choice display
// when player has already made choice for this round

{/* Show locked choice instead of choice buttons if already chosen */}
{isLocked && lockedChoice ? (
  <div className="choice-locked-display">
    <h3>Your Choice for Round {currentRound}</h3>
    <div className="locked-choice-card">
      <span className="choice-icon">
        {config.choices.find(c => c.id === lockedChoice.choiceId)?.icon}
      </span>
      <p className="choice-label">
        {config.choices.find(c => c.id === lockedChoice.choiceId)?.label}
      </p>
      <p className="locked-indicator">🔒 Locked</p>
    </div>

    {/* Show URL to share */}
    <div className="url-reminder">
      <p>Share this URL with your opponent:</p>
      <URLSharer gameState={gameState} />
      <small>
        💡 Your choice is locked. Reload this page if you need to copy the URL again.
      </small>
    </div>
  </div>
) : (
  // Show choice buttons only if NOT locked
  <DynamicChoiceBoard
    config={config}
    onChoiceSelected={(choice) => makeChoice(currentPlayer, choice)}
    playerNumber={currentPlayer}
  />
)}
```

**UI Implementation Notes**:
- When `isLocked && lockedChoice` is true, render locked choice display instead of buttons
- Show the choice they made (with icon/label from config)
- Show the URL they need to share
- Provide helpful message explaining they can reload to get URL again
- This handles the "positive intent" scenario where player just wants to verify or re-send URL

**VALIDATE**:
```bash
cd correspondence-games-framework/games/rock-paper-scissors
npm run type-check
npm run lint
```

**IF_FAIL**:
- Check import paths
- Verify hook dependencies
- Check TypeScript strict null checks

**ROLLBACK**: `git checkout correspondence-games-framework/games/rock-paper-scissors/src/App.tsx`

---

#### Task 2.2: MODIFY `correspondence-games-framework/games/dilemma/src/App.tsx`

**Apply same changes as Task 2.1** - Both games have identical App.tsx structure

**Steps**:
1. Add import for `useChoiceLock`
2. Add hook to component
3. Update `makeChoice` to validate and lock
4. Update `startNewGame` to clear locks
5. Update `makeNextChoiceAfterResults` to validate and lock
6. Add UI logic for locked choice display (conditional rendering)

**IMPORTANT**: The locked choice display UI (Change 6 from Task 2.1) is REQUIRED, not optional. This is what implements the "positive intent" behavior where players who reload a URL see their locked choice instead of being allowed to choose again.

**VALIDATE**:
```bash
cd correspondence-games-framework/games/dilemma
npm run type-check
npm run lint
```

**IF_FAIL**: Same troubleshooting as Task 2.1

**ROLLBACK**: `git checkout correspondence-games-framework/games/dilemma/src/App.tsx`

---

### Phase 3: Testing & Validation

**Objective**: Verify choice locking works as expected

#### Task 3.1: Manual Testing - Happy Path

**Test Case 1: Choice Lock Prevents Retry**
```
GIVEN: A new game with gameId "abc123"
WHEN:
  1. Player 1 opens game
  2. Player 1 chooses "rock" for round 1
  3. Player 1 generates URL and copies it
  4. Player 1 refreshes page
  5. Player 1 tries to choose "paper" instead
THEN:
  - Alert shows: "Cannot change choice: You already chose 'rock'"
  - Choice remains "rock"
  - localStorage contains lock for gameId=abc123, round=1, player=1, choice=rock
```

**Test Case 2: URL Re-Load Shows Previous Choice (Positive Intent)**
```
GIVEN: Player 1 has made choice "rock" and sent URL to Player 2
AND: Player 2 has made choice "paper" and sent new URL back
WHEN:
  1. Player 1 clicks Player 2's URL (wanting to verify or re-send)
  2. App loads Player 2's URL (shows Player 2 chose "paper")
  3. App checks localStorage: "Player 1 already chose for this round"
THEN:
  - ✅ UI shows: "Your choice: rock" (locked choice display)
  - ✅ UI shows: URL to share (the one Player 1 originally sent)
  - ❌ UI does NOT show: Choice buttons
  - ✅ Player can copy their original URL to re-send if needed
  - 💡 Assumes: Player just wanted to verify choice or get URL again
```

**Test Case 3: Back Button Cannot Bypass Lock**
```
GIVEN: Player 1 has made choice "rock" for round 1
AND: URL has updated to include "rock" choice
AND: localStorage has lock: {gameId: "abc", round: 1, player: 1, choice: "rock"}
WHEN:
  1. Player 1 hits browser BACK button
  2. Browser URL changes to previous state (before choice)
  3. useEffect triggers due to hash change
  4. App re-renders with previous URL state
THEN:
  - ✅ App checks localStorage for lock
  - ✅ Finds lock for round 1, player 1, choice "rock"
  - ✅ UI shows locked choice display (NOT choice buttons)
  - ❌ Player CANNOT make different choice
  - 💡 localStorage persistence defeats back button time travel
```

**Test Case 4: Choice Lock Allows Idempotent Retry (If Buttons Visible)**
```
GIVEN: Player 1 has already locked choice "rock"
AND: UI still shows choice buttons (edge case)
WHEN:
  1. Player 1 clicks "rock" again (same choice)
THEN:
  - No error shown
  - Choice is accepted (idempotent operation)
  - localStorage lock unchanged
```

**Test Case 5: Choice Lock Clears on New Game**
```
GIVEN: Player has locks from previous game
WHEN:
  1. Player clicks "Start New Game"
  2. Player makes a choice
THEN:
  - Old locks are cleared
  - New lock is created for new gameId
  - No errors
```

**Test Case 6: Cross-Tab Synchronization**
```
GIVEN: Player has game open in Tab A and Tab B
WHEN:
  1. Tab A makes choice "rock"
  2. Tab B tries to make choice "paper"
THEN:
  - Tab B detects lock via storage event
  - Tab B shows error
```

**VALIDATE**:
- Open DevTools -> Application -> Local Storage
- Verify `choice-lock-*` keys are created with correct structure
- Verify locks are cleared on new game
- Verify error messages are user-friendly

---

#### Task 3.2: Edge Case Testing

**Test Case 5: localStorage Disabled (Incognito Mode)**
```
GIVEN: Player uses private browsing mode
WHEN:
  1. Player makes a choice
  2. localStorage.setItem throws error
THEN:
  - Choice lock fails gracefully
  - Game continues without lock (security downgrade)
  - Warning logged to console
```

**Test Case 6: Corrupted localStorage Lock**
```
GIVEN: Lock exists but has invalid JSON
WHEN:
  1. Player makes a choice
  2. getChoiceLock attempts to parse
THEN:
  - Parse error is caught
  - Lock is treated as non-existent
  - New lock is created
```

**Test Case 7: Very Old Locks**
```
GIVEN: Lock exists from 30 days ago
WHEN:
  1. clearOldLocks(7) is called
THEN:
  - Old lock is removed
  - localStorage is cleaned up
```

**VALIDATE**:
```bash
# In browser console:
localStorage.setItem('choice-lock-test-r1-p1', 'invalid json');
# Then try to make a choice - should handle gracefully

# Test cleanup:
import { clearOldLocks } from './framework/storage/choiceLockManager';
clearOldLocks(7);
```

---

### Phase 4: Documentation & Audit Report

**Objective**: Document findings and implementation

#### Task 4.1: CREATE Audit Report

**CREATE**: `correspondence-games-framework/storage-audit-report.md`

```markdown
# Browser Storage Audit Report
**Date**: YYYY-MM-DD
**Games Audited**: dilemma, rock-paper-scissors

## Executive Summary

Both deployed game instances were **not using localStorage as specified in the PRD**. Current implementation uses simple base64-encoded URLs with full state, lacking encryption, HMAC signatures, and checksum verification.

## Detailed Findings

### Specification Compliance

| Feature | PRD Spec | Actual | Status |
|---------|----------|--------|--------|
| localStorage usage | Primary storage | Not used | ❌ Missing |
| URL format | Delta-based (move only) | Full state | ❌ Non-compliant |
| Encryption | AES-256 | None (base64 only) | ❌ Missing |
| HMAC signatures | Required | Not implemented | ❌ Missing |
| SHA-256 checksums | Required | Not implemented | ❌ Missing |
| Anti-tamper | Checksum + HMAC | None | ❌ Missing |

### Current Implementation

**File**: `App.tsx` (both games)
**URL Encoding**:
```typescript
// Current (insecure):
const encoded = btoa(JSON.stringify(gameState));
window.location.hash = encoded;

// Specified (secure):
const encrypted = await encryptGameState(delta);
const hmac = await generateHMAC(encrypted);
const url = `#${encrypted}.${hmac}`;
```

**State Storage**:
- ❌ No localStorage usage
- ✅ Full state in URL (works but violates PRD)
- ❌ No persistence across sessions
- ❌ No checksum verification

### Security Implications

**Current Vulnerabilities**:
1. URLs are easily decoded (base64 is encoding, not encryption)
2. State can be freely modified (no HMAC verification)
3. No replay attack prevention
4. No choice-locking mechanism

**Attack Scenarios**:
1. Player decodes URL, modifies score, re-encodes → Free points
2. Player changes opponent's choice in URL → Cheating
3. Player reverts to old URL → Replay previous state

## Implemented Changes

### Anti-Cheat: Choice Locking

**New Files**:
- `src/framework/storage/choiceLockManager.ts` - Choice lock utilities
- `src/framework/hooks/useChoiceLock.ts` - React hook

**Modified Files**:
- `games/rock-paper-scissors/src/App.tsx` - Added choice locking
- `games/dilemma/src/App.tsx` - Added choice locking

**How It Works**:
1. When player makes choice, store lock in localStorage
2. Lock key: `choice-lock-{gameId}-r{round}-p{player}`
3. On retry, validate new choice matches locked choice
4. If mismatch, show error and block change
5. Locks cleared when starting new game

**Security Level**: "Middle of the road"
- ✅ Prevents casual cheating (page refresh)
- ✅ Survives browser restarts
- ✅ Cross-tab synchronization
- ❌ Can be bypassed via DevTools (acceptable tradeoff)

### Testing Results

**Passed**:
- ✅ Choice lock prevents retry with different choice
- ✅ Idempotent retry (same choice) works
- ✅ Locks cleared on new game
- ✅ Cross-tab synchronization works
- ✅ Graceful degradation when localStorage disabled

**Edge Cases Handled**:
- ✅ Corrupted lock data (ignored, new lock created)
- ✅ localStorage quota exceeded (warning, game continues)
- ✅ Old lock cleanup utility

## Recommendations

### Short-Term (Quick Wins)

1. **Keep current implementation** - Works for MVP, simple to understand
2. **Choice locking implemented** - Addresses user's immediate concern
3. **Add disclaimer** - "This is a trust-based game" on UI

### Medium-Term (Full PRD Compliance)

1. **Implement delta-based URLs** - Use framework's existing encryption utilities
2. **Add HMAC verification** - Already implemented in `hmacManager.ts`
3. **Add checksums** - Already implemented in `checksumManager.ts`
4. **Migrate to localStorage-first** - Store full state locally, only delta in URL

**Effort Estimate**: 2-3 days (most code already exists, just needs integration)

**Architectural Benefit**: Full PRD implementation would make "positive intent UX" **automatic**:
- App always checks localStorage first for gameId
- If player already made choice, it's in localStorage
- URL only provides opponent's delta
- UI naturally renders locked choice (no need for explicit choice-lock UI logic)
- Current choice-locking is a "bridge solution" until full PRD migration

### Long-Term (Production Hardening)

1. **Server-side validation** - Add optional server to verify game moves
2. **Cryptographic commitment scheme** - Both players commit to choice before revealing
3. **Blockchain integration** - Immutable game history (overkill for most use cases)

## Conclusion

**Current State**: Games work but use simplified storage model
**Implemented**: Choice-locking anti-cheat mechanism
**Gap**: Full PRD compliance requires integrating existing framework security utilities
**Recommendation**: Ship choice-locking now, plan migration to full PRD spec for v2.0
```

**VALIDATE**: Review report for accuracy

---

#### Task 4.2: UPDATE Documentation

**MODIFY**: `correspondence-games-framework/framework-considerations.md`

**Add section** at end:

```markdown
## Anti-Cheat: Choice Locking

### Overview

Games implement a choice-locking mechanism using localStorage to prevent players from retrying different choices in the same round.

### How It Works

1. **First Choice**: Player makes a choice → Lock stored in localStorage
2. **Retry Attempt**: Player tries different choice → Error shown, change blocked
3. **Idempotent Retry**: Player clicks same choice again → Allowed (no error)
4. **New Game**: Locks cleared → Fresh start

### Implementation

```typescript
import { useChoiceLock } from './framework/hooks/useChoiceLock';

function GameComponent() {
  const { validateAndLock } = useChoiceLock(gameId, round, player);

  const handleChoice = (choice: string) => {
    try {
      validateAndLock(choice);
      // Choice is valid and locked
    } catch (error) {
      alert(error.message); // "You already chose X"
    }
  };
}
```

### Storage Format

**localStorage Key**: `choice-lock-{gameId}-r{round}-p{player}`

**Value**:
```json
{
  "gameId": "abc123",
  "round": 1,
  "player": 1,
  "choiceId": "rock",
  "timestamp": "2024-10-05T12:00:00Z",
  "locked": true
}
```

### Security Considerations

**Protection Level**: "Middle of the road" deterrent
- ✅ Prevents casual cheating (refresh, back button)
- ✅ Survives browser restarts
- ✅ Works across tabs
- ❌ Can be bypassed via DevTools (acceptable for trust-based games)

**Graceful Degradation**:
- If localStorage disabled (incognito), game works without locks
- If lock corrupted, treated as non-existent

### Cleanup

Locks are automatically cleared when:
1. Starting a new game (gameId changes)
2. Manual cleanup via `clearOldLocks(7)` (removes locks > 7 days old)

### Cross-Tab Synchronization

Uses `storage` event listener to detect lock changes in other tabs:

```typescript
window.addEventListener('storage', (e) => {
  if (e.key?.startsWith('choice-lock-')) {
    // Reload lock state
  }
});
```
```

**VALIDATE**:
```bash
# Check markdown formatting
cat correspondence-games-framework/framework-considerations.md
```

---

## Validation Loop

### Level 1: Syntax & Type Check

```bash
# Framework code
cd /home/ryankhetlyr/Development/correspondence-games
npm run type-check

# Rock-Paper-Scissors game
cd correspondence-games-framework/games/rock-paper-scissors
npm run type-check
npm run lint

# Dilemma game
cd correspondence-games-framework/games/dilemma
npm run type-check
npm run lint
```

**Expected**: Zero errors

**If Fail**:
- Check import paths
- Verify TypeScript strict mode compliance
- Check React hooks dependencies

---

### Level 2: Build Test

```bash
# Rock-Paper-Scissors
cd correspondence-games-framework/games/rock-paper-scissors
npm run build

# Dilemma
cd correspondence-games-framework/games/dilemma
npm run build
```

**Expected**: Builds succeed, no warnings

**If Fail**:
- Check Vite config
- Verify all imports resolve
- Check for circular dependencies

---

### Level 3: Manual Integration Test

**Test Script**:
```bash
# 1. Start Rock-Paper-Scissors
cd correspondence-games-framework/games/rock-paper-scissors
npm run dev

# 2. Open http://localhost:5173
# 3. Open DevTools -> Application -> Local Storage
# 4. Start new game
# 5. Make choice "rock"
# 6. Verify lock appears: choice-lock-{gameId}-r1-p1
# 7. Verify UI shows locked choice display (NOT choice buttons)
# 8. Note current URL in address bar

# Back Button Test:
# 9. Hit browser BACK button
# 10. Verify URL changes to previous state
# 11. Verify UI STILL shows locked choice display
# 12. Verify choice buttons are NOT visible
# 13. Verify localStorage lock still exists

# Refresh Test:
# 14. Refresh page
# 15. Verify locked choice display persists
# 16. Try to choose "paper" (if buttons somehow visible)
# 17. Verify error: "You already chose 'rock'"
# 18. Check console for warnings
```

**Expected**:
- Choice lock created in localStorage
- Error shown on retry with different choice
- Same choice allowed (idempotent)
- No console errors

**If Fail**:
- Check localStorage permissions
- Verify hook dependencies
- Check error handling

---

### Level 4: Cross-Game Consistency

**Verify both games have identical choice-locking behavior**:

```bash
# Test dilemma game
cd correspondence-games-framework/games/dilemma
npm run dev

# Run same manual test as rock-paper-scissors
# Behavior should be identical
```

**Expected**: Both games work identically

**If Fail**: Check for copy-paste errors between games

---

## Success Criteria

- [ ] Choice locking implemented and working
- [ ] Both games updated (dilemma, rock-paper-scissors)
- [ ] Framework utilities created (choiceLockManager, useChoiceLock)
- [ ] Error messages are user-friendly
- [ ] localStorage gracefully degrades if unavailable
- [ ] Cross-tab synchronization works
- [ ] **Positive intent UX implemented**: Locked choice display instead of choice buttons on URL reload
- [ ] Audit report documents current state vs PRD
- [ ] Documentation updated with choice-locking pattern
- [ ] All type checks pass
- [ ] All builds succeed
- [ ] Manual tests pass (including Test Case 2: URL re-load behavior)

---

## Rollback Strategy

If implementation causes issues:

```bash
# Rollback framework utilities
git checkout src/framework/storage/choiceLockManager.ts
git checkout src/framework/hooks/useChoiceLock.ts

# Rollback game changes
git checkout correspondence-games-framework/games/rock-paper-scissors/src/App.tsx
git checkout correspondence-games-framework/games/dilemma/src/App.tsx

# Rollback docs
git checkout correspondence-games-framework/framework-considerations.md
git checkout correspondence-games-framework/storage-audit-report.md

# Rebuild
npm run build
```

---

## Notes & Assumptions

**Assumptions**:
1. Both games have identical App.tsx structure (verified in audit)
2. localStorage is available in target browsers (graceful degradation if not)
3. "Middle of the road" security is acceptable (not Fort Knox)
4. Users understand this is trust-based gameplay

**Future Enhancements** (Out of Scope):
1. Migrate to full PRD specification (localStorage-first, delta URLs, HMAC)
2. Add cryptographic commitment scheme
3. Server-side move validation
4. Implement full checksum verification for localStorage

**Architectural Insight** (User's Observation):
The user noted: "I wonder if this is how it will behave anyway if we integrate all the other aspects of the framework that we designed but didn't use."

**Answer**: YES! The full PRD-compliant localStorage-first architecture would provide this behavior automatically:
- localStorage would be source of truth for player's own choices
- URLs would only contain opponent's latest move (delta)
- App would load localStorage → see player already chose → show locked choice
- No need for explicit choice-lock UI conditional logic

**Current approach**: Explicit choice-locking is necessary because current implementation stores NO state in localStorage (all state in URL). This is a "bridge solution" that adds the desired behavior without full architecture refactor.

**Trade-offs Made**:
- ✅ Simplicity over perfect security (acceptable for trust-based games)
- ✅ Client-side only (no server required)
- ✅ Quick implementation (reuses existing patterns)
- ✅ Bridge solution until full PRD migration
- ❌ Not foolproof (determined attacker can bypass)

---

## Completion Checklist

- [ ] Phase 1: Choice lock manager created
- [ ] Phase 1: useChoiceLock hook created
- [ ] Phase 2: rock-paper-scissors updated
- [ ] Phase 2: dilemma updated
- [ ] Phase 3: Manual testing completed
- [ ] Phase 3: Edge case testing completed
- [ ] Phase 4: Audit report written
- [ ] Phase 4: Documentation updated
- [ ] Validation: All type checks pass
- [ ] Validation: All builds succeed
- [ ] Validation: Manual tests pass
- [ ] Git commit created
- [ ] Changes deployed (optional)
