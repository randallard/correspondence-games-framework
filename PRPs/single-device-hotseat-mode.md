---
name: "Single-Device Hot-Seat Mode"
description: "Enable two players to play on the same device by passing it back and forth"
date: 2025-10-10
---

## Goal

Implement hot-seat mode where two players can play on a single device by passing it back and forth, with privacy screens between turns.

## Why

**Current Problem**:
- URL-based correspondence mode has localStorage issues causing player names to leak
- Need a simpler gameplay mode that works reliably on one device
- Foundation for understanding game flow before fixing URL mode

**Why This Matters**:
- Proves the core game mechanics work correctly
- Simpler state management (no URL encoding/decoding)
- Good for in-person play, demos, and testing
- No network/URL complications

## What (User-Visible Behavior)

### Flow Diagram

```
[Start] → [P1 Name Check] → [P1 Turn] → [Hand to P2 Screen] →
[P2 Name Check] → [P2 Turn] → [Hand to P1 Screen] → [P1 Turn] → ...
```

### Detailed Flow

**1. Player 1 Name Check**
- App loads, checks localStorage for `player1Name`
- Shows: "Player 1, your name is [NAME]. [Change Name] [Start Game]"
- If no name: "Player 1, enter your name: [input] [Start Game]"

**2. Player 1 Turn**
- Shows: "Player 1 ([NAME])'s Turn"
- Shows emoji chain (or empty state)
- Shows emoji selector
- Shows: [Add Emoji to Chain] button
- After adding emoji: [End Turn] button appears

**3. Hand to Player 2 Screen**
- Shows: "🔄 Hand device to Player 2"
- Shows: [Player 2, Click Here to Continue] button
- **Privacy**: No game state visible, just instruction

**4. Player 2 Name Check** (first time only)
- Shows: "Player 2, your name is [NAME]. [Change Name] [Continue Game]"
- If no name: "Player 2, enter your name: [input] [Continue Game]"

**5. Player 2 Turn**
- Shows: "Player 2 ([NAME])'s Turn"
- Shows emoji chain with Player 1's emoji
- Shows emoji selector
- Shows: [Add Emoji to Chain] button
- After adding emoji: [End Turn] button appears

**6. Hand to Player 1 Screen**
- Shows: "🔄 Hand device to Player 1"
- Shows: [Player 1, Click Here to Continue] button
- **Privacy**: No game state visible

**7. Repeat** turns 2-6

### Key Features

- ✅ **Privacy Screens**: Blank screen between turns so opponent can't see your choice
- ✅ **Name Persistence**: Player names saved in localStorage (`player1Name`, `player2Name`)
- ✅ **Name Change**: Option to change name at start of each turn
- ✅ **Clear Turn Indicators**: Always shows whose turn it is
- ✅ **No URL Encoding**: Game state stays in React state/localStorage only
- ✅ **Turn Counter**: Track turn number for game history

## All Needed Context

### Reference Documents
- **PlayerStorage pattern**: `packages/core/src/lib/player-storage.ts` - localStorage with XSS protection
- **Game state schema**: `packages/core/src/lib/emoji-game-schema.ts` - Already has player names
- **Current App.tsx**: `games/emoji-chain/src/App.tsx` - React component structure

### State Management Strategy

**React State**:
```typescript
const [gameState, setGameState] = useState<EmojiGameState | null>(null);
const [player1Name, setPlayer1Name] = useState<string | null>(null);
const [player2Name, setPlayer2Name] = useState<string | null>(null);
const [gameMode, setGameMode] = useState<'url' | 'hotseat'>('url'); // NEW!
const [turnPhase, setTurnPhase] = useState<'playing' | 'handoff'>('playing'); // NEW!
```

**localStorage Keys**:
```typescript
'correspondence-games:player1-name' // Player 1's name
'correspondence-games:player2-name' // Player 2's name
'correspondence-games:game-mode'    // 'url' or 'hotseat'
'correspondence-games:hotseat-game' // Current hot-seat game state
```

### Component Structure

**Screens to Implement**:
1. `ModeSelector` - Choose URL or Hot-Seat mode
2. `PlayerNameCheck` - Verify/set player name before turn
3. `GamePlay` - Existing game UI (emoji chain, selector, add button)
4. `HandoffScreen` - Privacy screen between turns

**State Machine**:
```typescript
type GamePhase =
  | 'mode-select'
  | 'p1-name-check'
  | 'p1-playing'
  | 'p1-end-turn'
  | 'handoff-to-p2'
  | 'p2-name-check'
  | 'p2-playing'
  | 'p2-end-turn'
  | 'handoff-to-p1'
```

### Security Considerations

**Privacy Between Turns**:
- Handoff screen must NOT show game state
- Emoji selector hidden during handoff
- Previous player's choice not visible

**XSS Protection**:
- Player names sanitized via PlayerStorage (already implemented)
- No eval or innerHTML usage

### Critical Gotchas

1. **Name collision**: `player1Name` and `player2Name` localStorage keys must be SEPARATE from the old `correspondence-games:player-name` key
2. **Mode switching**: If user switches from hot-seat to URL mode, game state must be converted
3. **Turn tracking**: Need to know whose turn it is after handoff (store in gameState.currentPlayer)
4. **Empty state**: Handle starting new game mid-session (reset turn counter)
5. **Browser refresh**: Hot-seat game should persist in localStorage and resume

### Patterns from Existing Code

**Conditional Rendering** (from App.tsx:203):
```typescript
if (!playerName) {
  return (
    <div className="container">
      <h1>🎮 Emoji Chain Game</h1>
      <p>Welcome! Please enter your name to start playing.</p>
      <button onClick={handleSetName}>Set Player Name</button>
    </div>
  );
}
```

**Game State Updates** (from App.tsx:158-167):
```typescript
const newState: EmojiGameState = {
  ...gameState,
  emojiChain: newChain,
  currentTurn: newTurn,
  currentPlayer: newPlayer,
  player1Name: gameState.player1Name,
  player2Name: gameState.player2Name,
  checksum: newChecksum,
};
setGameState(newState);
```

## Implementation Blueprint

### Phase 1: Create HotSeatStorage Class (TDD)

**File**: `packages/core/src/lib/hotseat-storage.ts`

**Test 1**: Store and retrieve player names separately
```typescript
it('should store player 1 and player 2 names separately', () => {
  const storage = new HotSeatStorage();

  storage.setPlayer1Name('Alice');
  storage.setPlayer2Name('Bob');

  expect(storage.getPlayer1Name()).toBe('Alice');
  expect(storage.getPlayer2Name()).toBe('Bob');
});
```

**Test 2**: Save and load hot-seat game state
```typescript
it('should save and load hot-seat game state', () => {
  const storage = new HotSeatStorage();
  const state: EmojiGameState = {
    gameId: crypto.randomUUID(),
    emojiChain: '🎮🎯',
    currentTurn: 2,
    currentPlayer: 1,
    player1Name: 'Alice',
    player2Name: 'Bob',
    checksum: 'abc123',
  };

  storage.saveHotSeatGame(state);
  const loaded = storage.loadHotSeatGame();

  expect(loaded).toEqual(state);
});
```

**Implementation**:
```typescript
// packages/core/src/lib/hotseat-storage.ts
import type { EmojiGameState } from './emoji-game-schema';
import { EmojiGameStateSchema } from './emoji-game-schema';

const PLAYER1_NAME_KEY = 'correspondence-games:player1-name';
const PLAYER2_NAME_KEY = 'correspondence-games:player2-name';
const HOTSEAT_GAME_KEY = 'correspondence-games:hotseat-game';

export class HotSeatStorage {
  private sanitize(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  getPlayer1Name(): string | null {
    return localStorage.getItem(PLAYER1_NAME_KEY);
  }

  setPlayer1Name(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player 1 name cannot be empty');
    }
    const sanitized = this.sanitize(name);
    localStorage.setItem(PLAYER1_NAME_KEY, sanitized);
  }

  getPlayer2Name(): string | null {
    return localStorage.getItem(PLAYER2_NAME_KEY);
  }

  setPlayer2Name(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player 2 name cannot be empty');
    }
    const sanitized = this.sanitize(name);
    localStorage.setItem(PLAYER2_NAME_KEY, sanitized);
  }

  saveHotSeatGame(state: EmojiGameState): void {
    localStorage.setItem(HOTSEAT_GAME_KEY, JSON.stringify(state));
  }

  loadHotSeatGame(): EmojiGameState | null {
    const item = localStorage.getItem(HOTSEAT_GAME_KEY);
    if (!item) return null;

    try {
      const parsed = JSON.parse(item);
      return EmojiGameStateSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse hot-seat game:', error);
      localStorage.removeItem(HOTSEAT_GAME_KEY);
      return null;
    }
  }

  clearHotSeatGame(): void {
    localStorage.removeItem(HOTSEAT_GAME_KEY);
  }
}
```

### Phase 2: Add Mode Selection to App.tsx

**Add state**:
```typescript
const [gameMode, setGameMode] = useState<'url' | 'hotseat' | null>(null);
const [turnPhase, setTurnPhase] = useState<'playing' | 'handoff'>('playing');
const [player1Name, setPlayer1Name] = useState<string | null>(null);
const [player2Name, setPlayer2Name] = useState<string | null>(null);

const hotSeatStorage = new HotSeatStorage();
```

**Mode selection screen**:
```typescript
if (!gameMode) {
  return (
    <div className="container">
      <h1>🎮 Emoji Chain Game</h1>
      <h2>Choose Game Mode</h2>
      <button onClick={() => setGameMode('hotseat')}>
        🪑 Hot-Seat Mode (Same Device)
      </button>
      <button onClick={() => setGameMode('url')}>
        🔗 URL Mode (Different Devices)
      </button>
    </div>
  );
}
```

### Phase 3: Implement Hot-Seat Flow

**Player name check screens**:
```typescript
// P1 name check
if (gameMode === 'hotseat' && !player1Name) {
  const savedName = hotSeatStorage.getPlayer1Name();

  return (
    <div className="container">
      <h1>🎮 Player 1</h1>
      {savedName ? (
        <>
          <p>Your name is: <strong>{savedName}</strong></p>
          <button onClick={() => setPlayer1Name(savedName)}>
            Start Game
          </button>
          <button onClick={() => {
            const newName = prompt('Enter new name:');
            if (newName) {
              hotSeatStorage.setPlayer1Name(newName);
              setPlayer1Name(newName);
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
              hotSeatStorage.setPlayer1Name(name);
              setPlayer1Name(name);
            }
          }}>
            Set Name
          </button>
        </>
      )}
    </div>
  );
}

// P2 name check (similar logic)
if (gameMode === 'hotseat' && gameState && gameState.currentPlayer === 2 && !player2Name) {
  // Similar to P1 but for Player 2
}
```

**Handoff screen**:
```typescript
if (gameMode === 'hotseat' && turnPhase === 'handoff') {
  const nextPlayer = gameState.currentPlayer === 1 ? 2 : 1;
  const nextName = nextPlayer === 1 ? player1Name : player2Name;

  return (
    <div className="container">
      <h1>🔄 Hand Device to Player {nextPlayer}</h1>
      <button onClick={() => {
        setTurnPhase('playing');
        // P2 name check will trigger if needed
      }}>
        Player {nextPlayer} ({nextName}), Click Here
      </button>
    </div>
  );
}
```

**End Turn button** (add to game UI):
```typescript
<button onClick={handleEndTurn} className="end-turn-button">
  End Turn
</button>

const handleEndTurn = () => {
  if (gameMode === 'hotseat') {
    // Save game state
    hotSeatStorage.saveHotSeatGame(gameState);
    // Switch to handoff
    setTurnPhase('handoff');
  }
};
```

### Phase 4: Update handleAddEmoji for Hot-Seat

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
    player1Name: player1Name || gameState.player1Name,
    player2Name: player2Name || gameState.player2Name,
    checksum: newChecksum,
  };

  setGameState(newState);

  if (gameMode === 'hotseat') {
    // Save immediately
    hotSeatStorage.saveHotSeatGame(newState);
    // Don't generate URL
  } else {
    // URL mode - existing logic
    const hash = encodeFullState(newState);
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    setShareUrl(url);
  }
};
```

## Validation Loop

### Level 1: Unit Tests (packages/core)
```bash
cd packages/core
npm test -- hotseat-storage.test.ts
```

**Expected**:
- ✅ Player names stored separately
- ✅ Game state saved and loaded correctly
- ✅ XSS protection for player names

### Level 2: Integration Tests (manual)
```bash
cd games/emoji-chain
npm run dev
```

**Test Case 1: First Game**
1. Select "Hot-Seat Mode"
2. P1 enters name "Alice", clicks Start
3. P1 adds emoji 🎮, clicks End Turn
4. Handoff screen shows
5. Click "Player 2, Click Here"
6. P2 enters name "Bob", clicks Continue
7. P2 sees 🎮, adds 🎯, clicks End Turn
8. Handoff screen shows
9. Click "Player 1, Click Here"
10. P1 sees 🎮🎯

**Expected**: Names persist, game flows smoothly, privacy maintained

**Test Case 2: Resume Game (Refresh)**
1. During game, refresh browser
2. Select "Hot-Seat Mode"
3. Should resume where left off

**Expected**: Game state restored from localStorage

**Test Case 3: Name Change**
1. Start game as P1 "Alice"
2. On P1's next turn, click "Change Name"
3. Change to "Alicia"
4. Game continues with new name

**Expected**: Name updates in UI and localStorage

## Success Criteria

- [ ] HotSeatStorage class implemented with tests passing
- [ ] Mode selection screen works
- [ ] Player 1 name check screen works
- [ ] Player 2 name check screen works
- [ ] Handoff screens show between turns
- [ ] End Turn button triggers handoff
- [ ] Game state persists in localStorage
- [ ] Browser refresh resumes game
- [ ] Names can be changed mid-game
- [ ] No game state visible during handoff (privacy)
- [ ] All existing URL mode tests still pass

## TDD Task Breakdown

1. [ ] Write HotSeatStorage test file
2. [ ] Write test: store/retrieve player names separately (RED)
3. [ ] Implement getPlayer1Name/setPlayer1Name (GREEN)
4. [ ] Write test: save/load game state (RED)
5. [ ] Implement saveHotSeatGame/loadHotSeatGame (GREEN)
6. [ ] Refactor: extract sanitize to shared function
7. [ ] Add gameMode state to App.tsx
8. [ ] Implement mode selection screen
9. [ ] Implement P1 name check screen
10. [ ] Implement P2 name check screen
11. [ ] Implement handoff screen
12. [ ] Add End Turn button and logic
13. [ ] Update handleAddEmoji for hot-seat
14. [ ] Add CSS for new screens
15. [ ] Test full hot-seat flow
16. [ ] Verify URL mode still works

## Timeline Estimate

- **Phase 1** (HotSeatStorage TDD): 30 minutes
- **Phase 2** (Mode selection): 15 minutes
- **Phase 3** (Hot-seat flow): 45 minutes
- **Phase 4** (Integration): 30 minutes
- **Testing**: 30 minutes
- **Total**: ~2.5 hours

## Next Steps

Ready to start Phase 1: Create `hotseat-storage.test.ts` with first failing test? 🚀
