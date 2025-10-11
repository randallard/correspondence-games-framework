# PRP: Tic-Tac-Toe Game (Emoji-Chain Pattern)

## Goal

Implement a fully functional Tic-Tac-Toe game using **all proven patterns from emoji-chain**:
- Hot-seat mode (single device, privacy screens between turns)
- URL mode (share game state via compressed URLs with delta encoding)
- Embedded targetPlayer in URLs (hidden in compressed payload)
- Separate player name storage (player1-name/player2-name)
- TDD with Zod validation throughout
- Win detection (8 winning patterns: 3 rows, 3 columns, 2 diagonals)
- Draw detection (board full, no winner)

**Success Definition:**
- All ~45 tests passing (schema, game logic, delta, URL encoding, storage)
- Hot-seat mode: complete game to win and draw
- URL mode: complete game with delta encoding verified
- Player names persist correctly across games
- Game over states handled properly (win/draw)
- No TypeScript errors
- Reuses `HotSeatStorage` from core package

## Why

**Business Value:**
- Validates correspondence-games framework with 2D board state (not just linear chain)
- Demonstrates win/draw detection patterns for future games
- Shows delta encoding efficiency: single cell index vs full 9-cell board (~60% smaller URLs)
- Classic game provides familiar onboarding experience

**Technical Value:**
- Proves framework scales beyond append-only games
- Establishes patterns for games with explicit win conditions
- Delta encoding shows clear advantage with board complexity
- TDD ensures correctness of win/draw logic (critical for game integrity)

**User Impact:**
- Same familiar UX from emoji-chain (mode selection, handoff screens, URL sharing)
- Classic game everyone understands
- Fast URL generation even mid-game

## What

### User-Visible Behavior

#### Hot-Seat Mode Flow
1. User selects "Play Hot-Seat Mode"
2. Prompted for Player 1 name (X) → stored as `player1-name`
3. Prompted for Player 2 name (O) → stored as `player2-name`
4. Player 1 sees 3×3 empty grid
5. Player 1 clicks cell → X appears, handoff screen: "Pass to [Player 2 Name]"
6. Player 2 clicks "I'm Ready" → sees board with X
7. Player 2 clicks empty cell → O appears, handoff screen: "Pass to [Player 1 Name]"
8. Continue alternating until win/draw
9. Game over screen shows:
   - Win: "🎉 [Winner Name] Wins!" with winning line highlighted
   - Draw: "🤝 It's a Draw!"
10. Options: "Play Again" (reset board, keep names) or "Main Menu"

#### URL Mode Flow
1. User selects "Play URL Mode"
2. Prompted for Player 1 name (X) → stored as `player1-name`
3. Player 1 clicks cell → X appears
4. URL generated with `#s=<compressed-payload>` (full state, turn 1)
5. Player 1 copies URL, shares with Player 2
6. Player 2 loads URL → prompted for name → stored as `player2-name`
7. Player 2 sees X on board, clicks empty cell → O appears
8. URL generated with `#d=<compressed-delta>` (delta encoding, turn 2+)
9. Continue alternating until win/draw
10. Game over screen (same as hot-seat)

#### UI Components

**Main Menu:**
```
🎮 Tic-Tac-Toe

[Play Hot-Seat Mode]
[Play URL Mode]
```

**Game Board:**
```
🎮 Tic-Tac-Toe - [Hot-Seat/URL] Mode

Player: [Current Player Name] (Change)
Current Player's Turn: [Current Player Name] (Player 1/2)
Turn: [N] / 9

[   ] [ X ] [   ]
[ O ] [ X ] [   ]
[   ] [   ] [   ]

Status: Player 2's turn
```

**Cell States:**
- Empty: Light gray, clickable, hover effect
- X: Red "❌" (Player 1)
- O: Blue "⭕" (Player 2)
- Winning cell: Green highlight with animation

**Handoff Screen (Hot-Seat):**
```
📱 Pass to [Next Player Name]

[Next Player Name], it's your turn!

[I'm Ready]
```

**URL Share Screen (URL Mode):**
```
📤 Share this URL with [Next Player Name]

[Copy URL]

Turn: 3 / 9
```

**Game Over Screen:**
```
🎉 [Winner Name] Wins!
Winning Pattern: [Row/Column/Diagonal Name]

Final Board:
[ X ] [ O ] [ X ]
[ O ] [ X ] [ O ]
[ O ] [ X ] [ O ]

[Play Again] [Main Menu]

---OR---

🤝 It's a Draw!
All cells filled with no winner.

Final Board:
[ X ] [ O ] [ X ]
[ X ] [ X ] [ O ]
[ O ] [ X ] [ O ]

[Play Again] [Main Menu]
```

## All Needed Context

### Proven Patterns from Emoji-Chain

**Reference Implementation:**
- `games/emoji-chain/src/App.tsx` - Main game logic, mode handling, player name prompts
- `packages/core/src/lib/hotseat-storage.ts` - Separate player name storage
- `packages/core/src/lib/emoji-game-schema.ts` - Zod validation patterns
- `packages/core/src/lib/delta.ts` - Delta creation, encoding, decoding, application
- `packages/core/src/lib/url-encoder.ts` - Full state encoding with embedded targetPlayer
- `packages/core/src/lib/checksum.ts` - SHA-256 checksum for state integrity
- All test files: `packages/core/__tests__/*.test.ts`

**Key Patterns to Reuse:**
1. **Game State Schema** (Zod)
2. **Delta Encoding** (HMAC + dual checksum)
3. **URL Encoding** (embedded targetPlayer)
4. **Player Name Storage** (separate keys)
5. **React State Management** (mode, game state, player names, handoff screens)
6. **TDD Approach** (test files alongside implementation)

### Game State Schema (Tic-Tac-Toe)

```typescript
// packages/core/src/lib/tic-tac-toe-schema.ts

import { z } from 'zod';

// Cell can be null (empty), 'X' (player 1), or 'O' (player 2)
export const CellSchema = z.union([z.null(), z.literal('X'), z.literal('O')]);
export type Cell = z.infer<typeof CellSchema>;

// Board is array of 9 cells (indices 0-8)
// Layout:
//   0 | 1 | 2
//  ---+---+---
//   3 | 4 | 5
//  ---+---+---
//   6 | 7 | 8
export const BoardSchema = z.array(CellSchema).length(9);
export type Board = z.infer<typeof BoardSchema>;

export const GameStatusSchema = z.enum([
  'playing',
  'player1_wins',
  'player2_wins',
  'draw'
]);
export type GameStatus = z.infer<typeof GameStatusSchema>;

export const TicTacToeGameStateSchema = z.object({
  gameId: z.string().uuid(),
  board: BoardSchema,
  currentTurn: z.number().int().min(0).max(9), // 0 = game start, 9 = board full
  currentPlayer: z.union([z.literal(1), z.literal(2)]),
  player1Name: z.string().min(1),
  player2Name: z.string(), // Empty until Player 2 joins
  status: GameStatusSchema,
  checksum: z.string().length(64), // SHA-256 hex
});
export type TicTacToeGameState = z.infer<typeof TicTacToeGameStateSchema>;
```

**Design Notes:**
- Board is 1D array (simpler serialization than 2D)
- Cell indices 0-8 map to grid positions
- Status is derived from board (checked after each move)
- Checksum covers entire state for tamper detection
- Empty player2Name until Player 2 joins (URL mode)

### Win Detection Logic

```typescript
// packages/core/src/lib/tic-tac-toe-game-logic.ts

const WINNING_LINES = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 3, 6], // Left column
  [1, 4, 7], // Middle column
  [2, 5, 8], // Right column
  [0, 4, 8], // Diagonal \
  [2, 4, 6], // Diagonal /
];

export interface WinResult {
  winner: 'X' | 'O' | null;
  winningLine: number[] | null; // Indices of winning cells
  winningLineName: string | null; // e.g., "Top Row", "Diagonal \"
}

export function checkWinner(board: Board): WinResult {
  for (let i = 0; i < WINNING_LINES.length; i++) {
    const [a, b, c] = WINNING_LINES[i];
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      const names = [
        'Top Row', 'Middle Row', 'Bottom Row',
        'Left Column', 'Center Column', 'Right Column',
        'Diagonal \\', 'Diagonal /'
      ];
      return {
        winner: board[a] as 'X' | 'O',
        winningLine: WINNING_LINES[i],
        winningLineName: names[i]
      };
    }
  }
  return { winner: null, winningLine: null, winningLineName: null };
}

export function checkDraw(board: Board): boolean {
  // Draw if board full and no winner
  return board.every(cell => cell !== null) && checkWinner(board).winner === null;
}

export function calculateGameStatus(board: Board): GameStatus {
  const { winner } = checkWinner(board);
  if (winner === 'X') return 'player1_wins';
  if (winner === 'O') return 'player2_wins';
  if (checkDraw(board)) return 'draw';
  return 'playing';
}
```

### Delta Structure

```typescript
// packages/core/src/lib/tic-tac-toe-delta.ts

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

// Same patterns as emoji-chain:
// - createDelta(gameId, cellIndex, mark, player, turn, prevChecksum, newChecksum)
// - encodeDelta(delta, targetPlayer) → "#d=<compressed>"
// - decodeDelta(hashFragment) → { delta, targetPlayer }
// - applyDelta(currentBoard, delta) → newBoard (with HMAC + checksum verification)
```

**Delta Efficiency:**
- Full state (9 cells + metadata): ~200-300 chars compressed
- Delta (1 cellIndex + mark + checksums): ~120-180 chars compressed
- **Savings: ~40-60% URL size reduction**

### Checksum Calculation

```typescript
// packages/core/src/lib/tic-tac-toe-checksum.ts
// Reuse existing calculateChecksum from emoji-chain

import { calculateChecksum } from './checksum';

export async function calculateBoardChecksum(state: TicTacToeGameState): Promise<string> {
  const serialized = JSON.stringify({
    gameId: state.gameId,
    board: state.board,
    currentTurn: state.currentTurn,
    currentPlayer: state.currentPlayer,
    player1Name: state.player1Name,
    player2Name: state.player2Name,
    status: state.status,
  });
  return calculateChecksum(serialized);
}
```

### Storage

```typescript
// packages/core/src/lib/tic-tac-toe-storage.ts

const GAME_STATE_KEY = 'correspondence-games:tic-tac-toe-state';

export class TicTacToeStorage {
  saveGameState(state: TicTacToeGameState): void {
    localStorage.setItem(GAME_STATE_KEY, JSON.stringify(state));
  }

  loadGameState(): TicTacToeGameState | null {
    const item = localStorage.getItem(GAME_STATE_KEY);
    if (!item) return null;

    try {
      const parsed = JSON.parse(item);
      return TicTacToeGameStateSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse Tic-Tac-Toe state:', error);
      localStorage.removeItem(GAME_STATE_KEY);
      return null;
    }
  }

  clearGameState(): void {
    localStorage.removeItem(GAME_STATE_KEY);
  }
}
```

### React Component Structure (App.tsx)

**State Management (mirrors emoji-chain):**
```typescript
const [gameMode, setGameMode] = useState<'hotseat' | 'url' | null>(null);
const [gameState, setGameState] = useState<TicTacToeGameState | null>(null);
const [player1Name, setPlayer1Name] = useState<string | null>(null);
const [player2Name, setPlayer2Name] = useState<string | null>(null);
const [shareUrl, setShareUrl] = useState<string>('');
const [waitingForHandoff, setWaitingForHandoff] = useState(false);

const hotSeatStorage = new HotSeatStorage();
const gameStorage = new TicTacToeStorage();
```

**Key Event Handlers:**
```typescript
// handleCellClick(cellIndex: number)
// - Validate move (cell empty, game still playing)
// - Create new board (clone + update cell)
// - Calculate checksums (prev, new)
// - Check win/draw
// - Update game state
// - Generate URL (URL mode) or show handoff (hot-seat)

// handleStartHotSeat()
// - Set gameMode to 'hotseat'
// - Load or create new game

// handleStartURL()
// - Set gameMode to 'url'
// - Clear player2Name from localStorage
// - Create new game
```

### Critical Gotchas

1. **Cell Click Validation:**
   - Check cell is empty: `board[cellIndex] === null`
   - Check game is playing: `status === 'playing'`
   - Validate cellIndex in range 0-8

2. **Win Detection Timing:**
   - Check win/draw AFTER applying move
   - If win/draw: DON'T switch currentPlayer
   - Update status immediately

3. **Empty Board Initialization:**
   - Use: `Array(9).fill(null)`
   - Never use undefined

4. **Player 2 Name Clearing (URL Mode):**
   - Clear from localStorage when starting new URL game
   - Prompt only when: `!player1Name && !player2Name`

5. **Delta Application:**
   - Verify HMAC first (tamper detection)
   - Verify prevChecksum matches current board
   - Apply move (immutably)
   - Verify newChecksum matches result

6. **Game Over State:**
   - Disable all cell clicks when `status !== 'playing'`
   - Show winner/draw message
   - Provide "Play Again" and "Main Menu" options

## Implementation Blueprint

### Phase 1: Core Game Logic (TDD)

#### Task 1.1: Game State Schema
**File:** `packages/core/src/lib/tic-tac-toe-schema.ts`
**Test:** `packages/core/__tests__/tic-tac-toe-schema.test.ts`

**Tests (8 tests):**
- ✅ Valid board with 9 cells
- ✅ Invalid board (wrong length)
- ✅ Invalid cells (not null/'X'/'O')
- ✅ Valid game state
- ✅ Invalid game state (missing fields)
- ✅ Create empty board returns 9 nulls
- ✅ Create new game has correct initial state
- ✅ GameStatus enum validation

**Validation:**
```bash
npm test -- tic-tac-toe-schema.test.ts
```

---

#### Task 1.2: Win Detection Logic
**File:** `packages/core/src/lib/tic-tac-toe-game-logic.ts`
**Test:** `packages/core/__tests__/tic-tac-toe-game-logic.test.ts`

**Tests (15 tests):**
- ✅ checkWinner: top row (X wins)
- ✅ checkWinner: middle row (O wins)
- ✅ checkWinner: bottom row (X wins)
- ✅ checkWinner: left column (O wins)
- ✅ checkWinner: center column (X wins)
- ✅ checkWinner: right column (O wins)
- ✅ checkWinner: diagonal \ (X wins)
- ✅ checkWinner: diagonal / (O wins)
- ✅ checkWinner: no winner on partial board
- ✅ checkWinner: no winner on full board (impossible but test)
- ✅ checkDraw: full board, no winner
- ✅ checkDraw: false when winner exists
- ✅ calculateGameStatus: playing
- ✅ calculateGameStatus: player1_wins
- ✅ calculateGameStatus: player2_wins
- ✅ calculateGameStatus: draw

**Validation:**
```bash
npm test -- tic-tac-toe-game-logic.test.ts
```

---

#### Task 1.3: Checksum
**File:** `packages/core/src/lib/tic-tac-toe-checksum.ts`
**Test:** `packages/core/__tests__/tic-tac-toe-checksum.test.ts`

**Tests (3 tests):**
- ✅ Same board → same checksum
- ✅ Different boards → different checksums
- ✅ Checksum is 64-char hex string

**Validation:**
```bash
npm test -- tic-tac-toe-checksum.test.ts
```

---

#### Task 1.4: Storage
**File:** `packages/core/src/lib/tic-tac-toe-storage.ts`
**Test:** `packages/core/__tests__/tic-tac-toe-storage.test.ts`

**Tests (4 tests):**
- ✅ Save/load round-trip
- ✅ Clear game state
- ✅ Invalid JSON → null
- ✅ Load when no game saved → null

**Validation:**
```bash
npm test -- tic-tac-toe-storage.test.ts
```

---

### Phase 2: Delta Encoding (TDD)

#### Task 2.1: Delta Creation
**File:** `packages/core/src/lib/tic-tac-toe-delta.ts`
**Test:** `packages/core/__tests__/tic-tac-toe-delta.test.ts`

**Tests (18 tests):**
- ✅ Create delta with all fields
- ✅ HMAC is deterministic
- ✅ Different deltas → different HMACs
- ✅ Encode delta with targetPlayer=1
- ✅ Encode delta with targetPlayer=2
- ✅ Hash format: "#d=..."
- ✅ Decode delta extracts targetPlayer=1
- ✅ Decode delta extracts targetPlayer=2
- ✅ Round-trip encode/decode
- ✅ Backward compatibility (old URLs)
- ✅ Apply valid delta to board
- ✅ Reject tampered HMAC
- ✅ Reject wrong prevChecksum
- ✅ Reject wrong newChecksum
- ✅ Reject delta on occupied cell
- ✅ Delta URL shorter than full state

**Validation:**
```bash
npm test -- tic-tac-toe-delta.test.ts
```

---

### Phase 3: URL Encoding (TDD)

#### Task 3.1: Full State Encoding
**File:** `packages/core/src/lib/tic-tac-toe-url-encoder.ts`
**Test:** `packages/core/__tests__/tic-tac-toe-url-encoder.test.ts`

**Tests (6 tests):**
- ✅ Encode with targetPlayer=1
- ✅ Encode with targetPlayer=2
- ✅ Hash format: "#s=..."
- ✅ Decode extracts targetPlayer
- ✅ Round-trip encode/decode
- ✅ URL length < 2000 chars

**Validation:**
```bash
npm test -- tic-tac-toe-url-encoder.test.ts
```

---

### Phase 4: React UI Implementation

#### Task 4.1: Project Setup
```bash
cd games
npm create vite@latest tic-tac-toe -- --template react-ts
cd tic-tac-toe
npm install @correspondence-games/core lz-string zod
```

**Update package.json:**
```json
{
  "dependencies": {
    "@correspondence-games/core": "workspace:*",
    "lz-string": "^1.5.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.1"
  }
}
```

---

#### Task 4.2: App.tsx - Main Game Component

**Structure (mirrors emoji-chain/App.tsx exactly):**

1. **Imports and State**
2. **Load Game from URL** (useEffect for hash parsing)
3. **Load Player Names** (useEffect for localStorage)
4. **Mode Selection Screen** (if !gameMode)
5. **Player 1 Name Prompt** (hot-seat and URL mode)
6. **Player 2 Name Prompt** (hot-seat only)
7. **URL Mode Player Name Prompt** (when loading URL: `!player1Name && !player2Name`)
8. **Handoff Screen** (hot-seat: `waitingForHandoff`)
9. **Main Game Board**
   - Current player display
   - 3×3 grid of cells
   - Cell click handler
   - Turn counter
10. **Game Over Screen** (status !== 'playing')
11. **URL Sharing** (URL mode: after move)

**Key Functions:**
```typescript
function handleStartHotSeat() { /* ... */ }
function handleStartURL() { /* ... */ }
function handleCellClick(cellIndex: number) { /* ... */ }
function handleHandoffReady() { /* ... */ }
function handlePlayAgain() { /* ... */ }
function handleMainMenu() { /* ... */ }
```

---

#### Task 4.3: CSS Styling

**Grid Layout:**
```css
.tic-tac-toe-grid {
  display: grid;
  grid-template-columns: repeat(3, 100px);
  grid-template-rows: repeat(3, 100px);
  gap: 8px;
  margin: 20px auto;
  width: fit-content;
}

.cell {
  width: 100px;
  height: 100px;
  border: 2px solid #333;
  background: #fff;
  font-size: 48px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cell:hover:not(.occupied):not(:disabled) {
  background: #e3f2fd;
}

.cell.occupied {
  cursor: not-allowed;
  background: #f5f5f5;
}

.cell.winning {
  background: #4caf50;
  animation: pulse 0.5s ease-in-out 3;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
```

---

### Phase 5: Integration Testing

#### Task 5.1: Manual Testing Checklist

**Hot-Seat Mode:**
- [ ] Start game → Player 1 name prompt
- [ ] Enter Player 1 name → Player 2 name prompt
- [ ] Enter Player 2 name → empty board
- [ ] Player 1 clicks cell → X appears, handoff screen
- [ ] "I'm Ready" → Player 2 sees X, their turn
- [ ] Player 2 clicks cell → O appears, handoff screen
- [ ] Continue until X wins → game over with winner
- [ ] "Play Again" → new board, same names
- [ ] Continue until draw → game over with draw
- [ ] "Main Menu" → back to mode selection

**URL Mode:**
- [ ] Start game → Player 1 name prompt
- [ ] Enter Player 1 name → empty board
- [ ] Player 1 clicks cell → X appears, URL shown
- [ ] Copy URL, open incognito
- [ ] Player 2 name prompt → enter name
- [ ] Player 2 sees X, clicks cell → O appears
- [ ] Copy URL, paste in Player 1 browser
- [ ] Continue alternating
- [ ] Verify delta encoding (turn 2+: URL < 300 chars)
- [ ] Complete to win → game over
- [ ] Start new URL game → Player 2 name cleared

**Error Cases:**
- [ ] Click occupied cell → no action
- [ ] Tamper URL HMAC → error
- [ ] Tamper URL checksum → error
- [ ] Load stale URL → checksum mismatch

---

## Validation Loop

### Level 1: Syntax & Type Checking
```bash
cd packages/core
npm run build

cd ../../games/tic-tac-toe
npm run build
```

### Level 2: Unit Tests
```bash
cd packages/core
npm test

# Expected results:
# ✅ tic-tac-toe-schema.test.ts (8 tests)
# ✅ tic-tac-toe-game-logic.test.ts (15 tests)
# ✅ tic-tac-toe-checksum.test.ts (3 tests)
# ✅ tic-tac-toe-storage.test.ts (4 tests)
# ✅ tic-tac-toe-delta.test.ts (18 tests)
# ✅ tic-tac-toe-url-encoder.test.ts (6 tests)
# Total: 54 tests passing
```

### Level 3: Integration Testing
```bash
cd games/tic-tac-toe
npm run dev

# Manual testing (see Phase 5.1 checklist)
```

### Level 4: Code Review
```bash
# Compare with emoji-chain:
diff games/emoji-chain/src/App.tsx games/tic-tac-toe/src/App.tsx

# Verify patterns match:
# - Mode selection
# - Player name prompts
# - Handoff screens
# - URL sharing
# - State management
```

---

## Success Criteria

- [ ] All 54 unit tests passing
- [ ] Hot-seat mode: game to win works
- [ ] Hot-seat mode: game to draw works
- [ ] URL mode: game to win works
- [ ] URL mode: delta encoding verified (URL size)
- [ ] Player names persist correctly
- [ ] Player 2 name cleared in URL mode
- [ ] Game over screens show correctly
- [ ] "Play Again" resets board, keeps names
- [ ] "Main Menu" resets everything
- [ ] No TypeScript errors
- [ ] No console errors
- [ ] URLs shareable (copy-paste works)
- [ ] Tampered URLs rejected

---

## Anti-Patterns to Avoid

- ❌ Don't mutate board arrays - use `[...board]`
- ❌ Don't skip win/draw checks after moves
- ❌ Don't use undefined for empty cells - use `null`
- ❌ Don't forget to clear player2Name in URL mode
- ❌ Don't switch currentPlayer when game ends
- ❌ Don't skip checksum verification
- ❌ Don't trust external data - validate with Zod
- ❌ Don't create new patterns - follow emoji-chain exactly

---

## Notes

**This PRP leverages 100% proven patterns from emoji-chain:**
- Same state management structure
- Same player name handling
- Same URL encoding (embedded targetPlayer)
- Same TDD approach
- Same localStorage patterns

**Key Differences from Emoji-Chain:**
- Board is 2D (9 cells) vs 1D chain
- Win detection required (8 patterns)
- Draw detection (board full)
- Cell indices instead of emoji selection

**Delta Encoding Advantage:**
- Emoji-chain: small delta (single emoji)
- Tic-Tac-Toe: moderate delta (cellIndex + mark)
- ~40-60% URL size reduction vs full board state

**Estimated Time:**
- Phase 1 (Core): 2-3 hours
- Phase 2 (Delta): 1-2 hours
- Phase 3 (URL): 1 hour
- Phase 4 (React): 3-4 hours
- Phase 5 (Testing): 1-2 hours
- **Total: 8-12 hours**

**Confidence Score: 9.5/10**
- All patterns proven in emoji-chain
- TDD ensures correctness
- Only new logic: win detection (straightforward 8-pattern check)
- React structure identical to emoji-chain
