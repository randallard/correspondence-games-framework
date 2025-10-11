# PRP: Tic-Tac-Toe Correspondence Game Implementation

## Goal

**Feature Goal**: Implement Tic-Tac-Toe as a correspondence game using the existing YAML configuration framework, validating the framework's extensibility to sequential turn-based games while introducing delta-based URLs with checksum verification for improved state integrity and 70-80% smaller URLs.

**Deliverable**: A fully functional Tic-Tac-Toe game that:
- Players alternate moves on a 3x3 board
- Board state is visible after each move
- Win detection runs mid-game (8 possible 3-in-a-row patterns)
- Game state shared via compressed delta URLs with checksums
- Choice locking prevents cheating
- Framework changes benefit all games (Prisoner's Dilemma, Rock-Paper-Scissors)

**Success Definition**:
- All 3 games work end-to-end after framework changes
- Tic-Tac-Toe playable with proper win/draw detection
- Delta URLs 70-80% smaller than full state encoding
- Checksum verification ensures state integrity
- `npm run validate` passes with zero errors

---

## Why

**Business Value**:
- Validates framework can support both simultaneous and sequential games
- Delta-based URLs reduce sharing friction (shorter, faster)
- Checksum verification prevents desync issues
- Classic game demonstrates framework to new users
- Breaking changes improve architecture for all games

**Technical Value**:
- Extends framework for broader game types
- Improves URL architecture for all games
- Establishes patterns for future sequential games (Connect Four, Chess)
- Delta + checksum approach is production-ready anti-cheat

**User Impact**:
- Familiar game (Tic-Tac-Toe) is easier onboarding
- Shorter URLs are easier to share
- State verification prevents confusion from desyncs
- Board visualization is more engaging than hidden choices

---

## What

### User-Visible Behavior

**Game Start**:
1. Player 1 opens app, sees empty 3x3 board
2. Clicks any position to place X
3. Position locks, URL generated
4. "Share this URL with your opponent" message

**Turn Flow**:
1. Player 2 opens URL, sees X placed on board
2. Clicks empty position to place O
3. Position locks, new URL generated
4. Players alternate until win/draw

**Win Condition**:
- Any 3-in-a-row (rows, columns, diagonals) triggers win
- Winner sees victory message with highlighted winning line
- Loser sees defeat message when opening final URL
- "Start New Game" button appears

**Draw Condition**:
- All 9 positions filled with no winner
- Both players see "It's a draw!" message
- "Start New Game" button appears

### Technical Requirements

**Framework Extensions** (Breaking Changes):
1. `GameProgression` type adds `type: 'simultaneous' | 'sequential'`
2. `GameConfig` adds `winConditions` array for sequential games
3. `GameState` schema adds `board`, `currentTurn`, `moves`, `winner`, `checksum`
4. New engine modules: `winDetector.ts`, `boardValidator.ts`
5. Delta-based URL encoding in `useURLState` hook

**Game-Specific Implementation**:
1. 3x3 board state: `(string | null)[]` with 9 elements
2. Win detection: Check 8 patterns after each move
3. Draw detection: Board full + no winner
4. Sequential turns: Player 1 → Player 2 → Player 1...
5. Choice locking: One position per turn

**Migration Required**:
1. Update Prisoner's Dilemma to delta URLs
2. Update Rock-Paper-Scissors to delta URLs
3. Test all games end-to-end after changes

### Success Criteria

- [ ] Player 1 can make first move (X)
- [ ] Move is locked in localStorage (anti-cheat)
- [ ] Delta URL generated with checksums and HMAC
- [ ] Player 2 can open URL and see X placed
- [ ] Players alternate turns correctly
- [ ] Win detection works for all 8 patterns
- [ ] Draw detection when board full
- [ ] Winner/loser messaging correct
- [ ] Game history saves completed games
- [ ] All validation commands pass
- [ ] Prisoner's Dilemma still works
- [ ] Rock-Paper-Scissors still works

---

## All Needed Context

### Context Completeness Check

✅ **"No Prior Knowledge" Test Applied**: This PRP includes:
- Complete codebase analysis with file paths and line numbers
- Exact patterns from Prisoner's Dilemma to follow
- All framework extension points documented
- Testing patterns with examples
- Validation commands and expected outputs
- External documentation references

### Documentation & References

```yaml
# CRITICAL CODEBASE ANALYSIS (Created by Research Agents)
- docfile: PRPs/ai_docs/prisoners_dilemma_analysis.md
  why: Complete PD implementation breakdown with exact file paths
  critical: |
    - Game state structure (lines 14-123)
    - URL encryption pipeline (lines 125-279)
    - Choice locking patterns (lines 281-424)
    - localStorage architecture (lines 426-545)
    - Hooks integration (lines 547-678)
    - Breaking changes comparison (lines 914-1098)

- docfile: PRPs/ai_docs/pd_vs_ttt_quick_reference.md
  why: Fast lookup for "Can I reuse this file?" decisions
  critical: |
    - Core differences table (quick comparison)
    - Schema transformation (remove X, add Y)
    - Reusable vs rebuild checklist
    - Win detection algorithm (complete code)

- docfile: PRPs/ai_docs/framework_core_architecture.md
  why: Framework extension points and patterns
  critical: |
    - Config system (YAML loading, Zod validation)
    - Storage managers (checksum, HMAC, choice lock)
    - Engine patterns (payoff, turn management)
    - Required framework changes for TTT (lines 5-6)

- docfile: PRPs/ai_docs/testing_patterns_analysis.md
  why: Testing strategies and patterns from codebase
  critical: |
    - Unit test patterns (hook testing, utils)
    - Integration test patterns (localStorage, URL)
    - Component test patterns (mocking, assertions)
    - Validation commands

- docfile: PRPs/ai_docs/react_component_patterns_for_tictactoe.md
  why: React patterns for grid/board components
  critical: |
    - Component structure (functional + TypeScript)
    - Grid rendering patterns (2D map)
    - Event handling (typed handlers)
    - Styling patterns (inline CSSProperties)
    - Complete TTT examples

# MUST READ - Framework Code Patterns
- file: src/framework/core/config/types.ts
  why: GameConfig interface structure - extend for TTT
  pattern: Lines 156-171 - Complete interface, needs winConditions array
  gotcha: All payoff rules must cover all combinations (validated)

- file: src/framework/core/config/loader.ts
  why: YAML loading and validation patterns
  pattern: Lines 192-227 - Zod validation + semantic checks
  gotcha: Semantic validation is strict (missing rules = error)

- file: src/framework/storage/checksumManager.ts
  why: SHA-256 checksum generation for state integrity
  pattern: Lines 76-92 (generate), 149-165 (verify)
  critical: Deterministic serialization required - same state = same checksum

- file: src/framework/storage/choiceLockManager.ts
  why: Anti-cheat localStorage locking - adapt for TTT turns
  pattern: Lines 37-60 (lock), 109-130 (validate)
  gotcha: Key format is `choice-lock-{gameId}-r{round}-p{player}` - change to turn-based

- file: src/framework/storage/hmacManager.ts
  why: URL tampering detection with HMAC-SHA256
  pattern: Lines 72-82 (generate), 106-126 (verify - constant time)
  critical: HMAC verification BEFORE decryption (security best practice)

- file: src/features/game/schemas/gameSchema.ts
  why: Zod schema patterns for game state validation
  pattern: Lines 1-247 - Complete schema with branded types, validation
  gotcha: Always validate external data (URLs, localStorage) with Zod

- file: src/features/game/hooks/useGameState.ts
  why: Game state management hook - adapt for board state
  pattern: Lines 1-278 - State initialization, makeChoice logic, resetGame
  critical: makeChoice → makeMove transformation for sequential turns

- file: src/features/game/hooks/useURLState.ts
  why: URL parsing and generation - extend for delta encoding
  pattern: Lines 1-184 - Encryption pipeline, HMAC verification, error handling
  gotcha: HMAC validation fails silently - check error states

- file: src/features/game/components/GameBoard.tsx
  why: Choice interface patterns - rebuild for 3x3 grid
  pattern: Lines 1-234 - Button-based choices, disabled state, click handlers
  critical: Rebuild as grid, but reuse event handling patterns

- file: src/features/game/components/GameResults.tsx
  why: Results display patterns - adapt for win/draw
  pattern: Lines 1-312 - Winner/loser display, game summary
  gotcha: Conditional rendering based on game phase

- file: src/features/game/utils/encryption.ts
  why: AES encryption for URL state - reuse as-is
  pattern: Lines 1-167 - Full encryption pipeline (AES + HMAC)
  critical: REUSABLE - works with any GameState structure

# MUST READ - Rock-Paper-Scissors Config (Complete Example)
- file: correspondence-games-framework/games/rock-paper-scissors/games/configs/rock-paper-scissors.yaml
  why: Complete YAML config example with 3 choices, 9 payoff rules
  pattern: Lines 1-131 - metadata, choices with icons, payoff rules, progression, UI
  critical: |
    - Zero-sum game (winner +1, loser -1, tie 0)
    - showPayoffMatrix: false (hidden for fun)
    - 3 rounds, alternating starter

# External Documentation
- url: https://en.wikipedia.org/wiki/Tic-tac-toe
  why: Game theory background (solved game, Nash equilibrium)
  section: Game theory and strategy
  critical: Perfect play always results in draw

- url: https://zod.dev/?id=arrays
  why: Zod array validation patterns for board state
  section: Arrays, .length(), .nonempty()
  critical: Use `.length(9)` for board array validation

- url: https://react.dev/reference/react/useState
  why: React hooks patterns for game state
  section: useState with complex state
  critical: Use functional updates for state based on previous state

- url: https://testing-library.com/docs/react-testing-library/intro
  why: React component testing patterns
  section: Queries, user events, async utilities
  critical: Use getByRole for accessibility-focused queries
```

### Current Codebase Structure

```bash
correspondence-games/
├── src/
│   ├── features/game/              # Prisoner's Dilemma (reference implementation)
│   │   ├── components/             # GameBoard, GameResults, URLSharer, etc.
│   │   ├── hooks/                  # useGameState, useURLState, useGameHistory
│   │   ├── schemas/                # gameSchema.ts (Zod validation)
│   │   ├── utils/                  # encryption, urlGeneration, payoffCalculation
│   │   └── integration/            # Playwright E2E tests
│   │
│   ├── framework/                  # Reusable framework (EXTEND for TTT)
│   │   ├── core/
│   │   │   ├── config/             # types.ts (GameConfig), loader.ts (YAML)
│   │   │   ├── engine/             # payoffEngine.ts, turnEngine.ts
│   │   │   └── schemas/            # baseSchema.ts (branded types)
│   │   ├── components/             # DynamicChoiceBoard, DynamicPayoffMatrix
│   │   ├── hooks/                  # useChoiceLock, useConfigLoader
│   │   └── storage/                # checksumManager, choiceLockManager, hmacManager
│   │
│   ├── shared/                     # Reusable utilities
│   │   ├── components/             # Button, ErrorBoundary, LoadingSpinner
│   │   ├── hooks/                  # useClipboard
│   │   └── utils/                  # constants.ts (GAME_SECRET)
│   │
│   ├── App.tsx                     # Main app orchestrator (MODIFY for TTT)
│   ├── main.tsx                    # Entry point (no changes)
│   └── test/setup.ts               # Vitest setup (mock crypto, localStorage)
│
├── PRPs/ai_docs/                   # Analysis documents (created by agents)
│   ├── prisoners_dilemma_analysis.md
│   ├── pd_vs_ttt_quick_reference.md
│   ├── framework_core_architecture.md
│   ├── testing_patterns_analysis.md
│   └── react_component_patterns_for_tictactoe.md
│
└── correspondence-games-framework/ # Game configs
    └── games/
        ├── rock-paper-scissors/
        │   └── games/configs/rock-paper-scissors.yaml
        └── dilemma/
            └── games/configs/prisoners-dilemma.yaml (if exists)
```

### Desired Codebase Structure (Files to Add)

```bash
# NEW: Tic-Tac-Toe specific files
src/games/tic-tac-toe/
├── config/
│   └── tic-tac-toe.yaml            # YAML game configuration
│
├── schemas/
│   └── ticTacToeSchema.ts          # Zod validation for board state
│
├── utils/
│   ├── winDetection.ts             # Win pattern checking (8 patterns)
│   ├── winDetection.test.ts        # Win detection tests
│   ├── boardValidator.ts           # Move validation logic
│   └── boardValidator.test.ts      # Move validation tests
│
├── components/
│   ├── TicTacToeBoard.tsx          # 3x3 grid component
│   ├── TicTacToeCell.tsx           # Individual cell component
│   ├── TicTacToeStatus.tsx         # Turn/win/draw display
│   └── TicTacToeBoard.test.tsx     # Component tests
│
├── hooks/
│   ├── useTicTacToeGame.ts         # Game logic hook
│   └── useTicTacToeGame.test.ts    # Hook tests
│
└── integration/
    ├── gameplay.integration.test.ts # Full game E2E tests
    └── urlSharing.integration.test.ts # URL sharing E2E tests

# MODIFY: Framework extensions
src/framework/
├── core/
│   ├── config/
│   │   └── types.ts                # ADD: winConditions, sequential progression
│   └── engine/
│       ├── winDetector.ts          # NEW: Generic win detection engine
│       └── boardValidator.ts       # NEW: Generic board validation
│
├── utils/
│   └── checksumDelta.ts            # NEW: Delta-based URL encoding
│
└── hooks/
    └── useURLState.ts              # MODIFY: Support delta encoding

# UPDATE: Existing games (migration)
src/features/game/
├── schemas/
│   └── gameSchema.ts               # ADD: checksum field
└── utils/
    └── urlGeneration.ts            # MODIFY: Use delta encoding
```

### Known Gotchas & Library Quirks

```typescript
// CRITICAL: Zod validation - Always validate external data
// ❌ BAD: Trusting URL/localStorage data
const gameState = JSON.parse(urlData);

// ✅ GOOD: Zod validation catches tampering/corruption
const gameState = GameStateSchema.parse(JSON.parse(urlData));

// CRITICAL: Choice Lock Key Format - Must change for turns
// Current (Prisoner's Dilemma): choice-lock-{gameId}-r{round}-p{player}
// New (Tic-Tac-Toe): choice-lock-{gameId}-t{turn}-p{player}

// CRITICAL: Checksum must be deterministic
// ❌ BAD: Including timestamps in checksum
const checksum = calculateChecksum({ board, timestamp: Date.now() });

// ✅ GOOD: Only game-critical data
const checksum = calculateChecksum({ board }); // Same board = same checksum

// CRITICAL: HMAC verification before decryption
// ❌ BAD: Decrypt then verify (security vulnerability)
const decrypted = decrypt(data);
if (!verifyHMAC(decrypted)) throw new Error();

// ✅ GOOD: Verify then decrypt (prevents attacks)
if (!verifyHMAC(data)) throw new Error();
const decrypted = decrypt(data);

// CRITICAL: React state updates must be immutable
// ❌ BAD: Mutating board array
board[index] = 'X';
setBoard(board);

// ✅ GOOD: Creating new array
const newBoard = [...board];
newBoard[index] = 'X';
setBoard(newBoard);

// CRITICAL: crypto-js and LZ-String are global side effects
// Import order matters in tests - mock BEFORE importing modules

// GOTCHA: localStorage can be disabled or full
// Always wrap in try/catch and provide fallback
try {
  localStorage.setItem(key, value);
} catch (error) {
  console.warn('localStorage unavailable:', error);
  // Fallback to memory-only mode
}

// GOTCHA: Vitest requires explicit typing for mocks
const mockSetItem = vi.fn((key: string, value: string) => { /* ... */ });

// GOTCHA: Playwright requires waiting for navigation/load states
await page.goto(url);
await page.waitForLoadState('networkidle'); // Ensure page loaded

// GOTCHA: Base64 URLs can contain + and / which need encoding
const encoded = btoa(encrypted); // May contain + and /
const urlSafe = encodeURIComponent(encoded); // Safe for URLs
```

---

## Implementation Blueprint

### Phase 0: Framework Preparation (Breaking Changes)

**Goal**: Extend framework to support sequential games and delta-based URLs

#### Task 0.1: CREATE src/framework/utils/checksumDelta.ts

**Purpose**: Delta-based URL encoding with checksum verification

```typescript
import CryptoJS from 'crypto-js';
import { GAME_SECRET } from '../../shared/utils/constants';

/**
 * Generate deterministic SHA-256 checksum for board state
 * CRITICAL: Must be deterministic - same board = same checksum
 */
export async function calculateBoardChecksum(board: (string | null)[]): Promise<string> {
  // Create canonical representation (no timestamps, UI state, etc.)
  const canonical = JSON.stringify({ board });

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(canonical);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBytes);

  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verify board checksum matches expected value
 */
export async function verifyBoardChecksum(
  board: (string | null)[],
  expectedChecksum: string
): Promise<boolean> {
  const actualChecksum = await calculateBoardChecksum(board);
  return actualChecksum === expectedChecksum;
}

/**
 * Create URL delta object for single move
 */
export interface URLDelta {
  gameId: string;
  move: {
    player: 1 | 2;
    position: string;  // 'pos-0' through 'pos-8'
    turn: number;
  };
  prevChecksum: string;  // Expected checksum BEFORE move
  newChecksum: string;   // Expected checksum AFTER move
  hmac: string;          // Tamper detection
}

export function createURLDelta(
  gameId: string,
  move: { player: 1 | 2; position: string; turn: number },
  prevChecksum: string,
  newChecksum: string
): URLDelta {
  const delta: Omit<URLDelta, 'hmac'> = {
    gameId,
    move,
    prevChecksum,
    newChecksum
  };

  // Generate HMAC for tamper detection
  const hmac = CryptoJS.HmacSHA256(
    JSON.stringify(delta),
    GAME_SECRET
  ).toString(CryptoJS.enc.Hex);

  return { ...delta, hmac };
}

/**
 * Apply URL delta to current state with verification
 */
export async function applyURLDelta(
  currentBoard: (string | null)[],
  delta: URLDelta,
  playerSymbol: string
): Promise<(string | null)[]> {
  // Verify HMAC first (tamper detection)
  const expectedHmac = CryptoJS.HmacSHA256(
    JSON.stringify({
      gameId: delta.gameId,
      move: delta.move,
      prevChecksum: delta.prevChecksum,
      newChecksum: delta.newChecksum
    }),
    GAME_SECRET
  ).toString(CryptoJS.enc.Hex);

  if (delta.hmac !== expectedHmac) {
    throw new Error('URL has been tampered with - HMAC mismatch');
  }

  // Verify current board matches expected previous state
  const matches = await verifyBoardChecksum(currentBoard, delta.prevChecksum);
  if (!matches) {
    const actualChecksum = await calculateBoardChecksum(currentBoard);
    throw new Error(
      `Board state mismatch!\n` +
      `Expected: ${delta.prevChecksum}\n` +
      `Actual: ${actualChecksum}\n` +
      `This URL may be outdated or you're missing previous moves.`
    );
  }

  // Apply move to board
  const newBoard = [...currentBoard];
  const index = parseInt(delta.move.position.split('-')[1]);
  newBoard[index] = playerSymbol;

  // Verify result matches expected new state
  const resultMatches = await verifyBoardChecksum(newBoard, delta.newChecksum);
  if (!resultMatches) {
    throw new Error('Move application failed - checksum mismatch');
  }

  return newBoard;
}
```

**Validation**:
```bash
# Create test file: src/framework/utils/checksumDelta.test.ts
npm run test -- checksumDelta.test.ts
```

---

#### Task 0.2: MODIFY src/framework/core/config/types.ts

**Changes**: Extend `GameProgression` and add `WinCondition` interface

```typescript
// ADD: Win condition interface (lines ~240)
export interface WinCondition {
  /** Position IDs that form winning pattern */
  pattern: string[];  // e.g., ['pos-0', 'pos-1', 'pos-2']

  /** Human-readable name */
  name: string;  // e.g., 'Top Row'
}

// MODIFY: GameProgression interface (lines 92-104)
export interface GameProgression {
  /** NEW: Game turn structure type */
  type: 'simultaneous' | 'sequential';

  /** Total rounds (for simultaneous games) */
  totalRounds: number;

  /** Maximum turns (for sequential games) */
  maxTurns?: number;

  /** Which player starts */
  startingPlayer: 1 | 2;

  /** Whether to alternate starter each round */
  alternateStarter: boolean;

  /** NEW: Turn order for sequential games */
  turnOrder?: 'alternating' | 'fixed';

  /** Whether to show running totals */
  showRunningTotal: boolean;
}

// MODIFY: GameConfig interface (lines 156-171)
export interface GameConfig {
  metadata: GameMetadata;
  choices: ChoiceOption[];
  payoffRules: PayoffRule[];
  progression: GameProgression;
  ui: GameUI;

  /** NEW: Win conditions for sequential games */
  winConditions?: WinCondition[];
}
```

**Validation**:
```bash
npm run type-check
# Expected: Zero TypeScript errors
```

---

#### Task 0.3: CREATE src/framework/core/engine/winDetector.ts

**Purpose**: Generic win detection for sequential games

```typescript
import type { GameConfig, WinCondition } from '../config/types';

export interface WinResult {
  won: boolean;
  pattern: string[] | null;
  name: string | null;
}

/**
 * Check if player has achieved any win condition
 *
 * @param board - Current board state (positions match config choice IDs)
 * @param playerSymbol - Symbol to check for (e.g., 'X', 'O')
 * @param config - Game configuration with win conditions
 * @returns Win result with pattern if won
 */
export function checkWinCondition(
  board: (string | null)[],
  playerSymbol: string,
  config: GameConfig
): WinResult {
  if (!config.winConditions) {
    return { won: false, pattern: null, name: null };
  }

  for (const condition of config.winConditions) {
    // Get board values at pattern positions
    const positions = condition.pattern.map(posId => {
      const index = parseInt(posId.split('-')[1]);
      return board[index];
    });

    // Check if all positions have player's symbol
    if (positions.every(pos => pos === playerSymbol)) {
      return {
        won: true,
        pattern: condition.pattern,
        name: condition.name
      };
    }
  }

  return { won: false, pattern: null, name: null };
}

/**
 * Check if game is a draw (board full, no winner)
 */
export function checkDrawCondition(board: (string | null)[]): boolean {
  return board.every(cell => cell !== null);
}

/**
 * Get all possible win patterns for UI visualization
 */
export function getAllWinPatterns(config: GameConfig): WinCondition[] {
  return config.winConditions || [];
}
```

**Validation**:
```bash
# Create test: src/framework/core/engine/winDetector.test.ts
npm run test -- winDetector.test.ts
```

---

#### Task 0.4: CREATE src/framework/core/engine/boardValidator.ts

**Purpose**: Generic move validation for board-based games

```typescript
export interface ValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * Validate move is legal
 */
export function validateMove(
  position: string,
  board: (string | null)[],
  currentPlayer: 1 | 2
): ValidationResult {
  const index = parseInt(position.split('-')[1]);

  // Position must be in range
  if (index < 0 || index >= board.length) {
    return {
      valid: false,
      error: `Invalid position: ${position}`
    };
  }

  // Position must be empty
  if (board[index] !== null) {
    return {
      valid: false,
      error: `Position ${position} already occupied by ${board[index]}`
    };
  }

  return { valid: true, error: null };
}

/**
 * Get list of available (empty) positions
 */
export function getAvailablePositions(board: (string | null)[]): number[] {
  return board
    .map((cell, index) => (cell === null ? index : -1))
    .filter(index => index !== -1);
}

/**
 * Check if board is completely full
 */
export function isBoardFull(board: (string | null)[]): boolean {
  return board.every(cell => cell !== null);
}
```

**Validation**:
```bash
npm run test -- boardValidator.test.ts
```

---

### Phase 1: Tic-Tac-Toe Core Implementation

**Goal**: Create game-specific logic, configuration, and validation

#### Task 1.1: CREATE src/games/tic-tac-toe/config/tic-tac-toe.yaml

**Purpose**: YAML game configuration

```yaml
metadata:
  id: tic-tac-toe
  name: "Tic-Tac-Toe"
  description: "Classic 3x3 grid game - get three in a row to win!"
  version: "1.0.0"
  tags: [classic, casual, strategy]

# 9 board positions
choices:
  - id: pos-0
    label: "Top Left"
    description: "Row 1, Column 1"
    icon: "⬜"
    position: { row: 0, col: 0 }

  - id: pos-1
    label: "Top Center"
    description: "Row 1, Column 2"
    icon: "⬜"
    position: { row: 0, col: 1 }

  - id: pos-2
    label: "Top Right"
    description: "Row 1, Column 3"
    icon: "⬜"
    position: { row: 0, col: 2 }

  - id: pos-3
    label: "Middle Left"
    description: "Row 2, Column 1"
    icon: "⬜"
    position: { row: 1, col: 0 }

  - id: pos-4
    label: "Center"
    description: "Row 2, Column 2"
    icon: "⬜"
    position: { row: 1, col: 1 }

  - id: pos-5
    label: "Middle Right"
    description: "Row 2, Column 3"
    icon: "⬜"
    position: { row: 1, col: 2 }

  - id: pos-6
    label: "Bottom Left"
    description: "Row 3, Column 1"
    icon: "⬜"
    position: { row: 2, col: 0 }

  - id: pos-7
    label: "Bottom Center"
    description: "Row 3, Column 2"
    icon: "⬜"
    position: { row: 2, col: 1 }

  - id: pos-8
    label: "Bottom Right"
    description: "Row 3, Column 3"
    icon: "⬜"
    position: { row: 2, col: 2 }

# Player symbols
players:
  - id: 1
    symbol: "❌"
    name: "X"
    color: "#e74c3c"

  - id: 2
    symbol: "⭕"
    name: "O"
    color: "#3498db"

# Win conditions (8 patterns: 3 rows, 3 cols, 2 diagonals)
winConditions:
  # Rows
  - pattern: ["pos-0", "pos-1", "pos-2"]
    name: "Top Row"
  - pattern: ["pos-3", "pos-4", "pos-5"]
    name: "Middle Row"
  - pattern: ["pos-6", "pos-7", "pos-8"]
    name: "Bottom Row"

  # Columns
  - pattern: ["pos-0", "pos-3", "pos-6"]
    name: "Left Column"
  - pattern: ["pos-1", "pos-4", "pos-7"]
    name: "Center Column"
  - pattern: ["pos-2", "pos-5", "pos-8"]
    name: "Right Column"

  # Diagonals
  - pattern: ["pos-0", "pos-4", "pos-8"]
    name: "Top-Left to Bottom-Right Diagonal"
  - pattern: ["pos-2", "pos-4", "pos-6"]
    name: "Top-Right to Bottom-Left Diagonal"

# Sequential turn-based gameplay
progression:
  type: sequential
  maxTurns: 9
  startingPlayer: 1
  turnOrder: alternating
  showRunningTotal: false

# UI Configuration
ui:
  primaryColor: "#2c3e50"
  secondaryColor: "#ecf0f1"
  cssClass: "tic-tac-toe-theme"
  showPayoffMatrix: false
  showChoiceDescriptions: false

  boardLayout:
    type: grid
    rows: 3
    cols: 3
    cellSize: "100px"
    gap: "8px"

# No payoff rules (not a points-based game)
payoffRules: []
```

**Validation**:
```bash
# Config will be validated by loader.ts automatically
# Test by importing in component
```

---

#### Task 1.2: CREATE src/games/tic-tac-toe/schemas/ticTacToeSchema.ts

**Purpose**: Zod validation for Tic-Tac-Toe game state

```typescript
import { z } from 'zod';
import {
  GameIdSchema,
  PlayerNumberSchema,
  DateTimeSchema
} from '../../../framework/core/schemas/baseSchema';

// Cell can be 'X', 'O', or null (empty)
export const CellSchema = z.union([
  z.literal('X'),
  z.literal('O'),
  z.null()
]);

// Board is 9 cells
export const BoardSchema = z.array(CellSchema).length(9);

// Individual move
export const MoveSchema = z.object({
  player: PlayerNumberSchema,
  position: z.string().regex(/^pos-[0-8]$/),  // 'pos-0' through 'pos-8'
  turn: z.number().int().min(1).max(9),
  timestamp: DateTimeSchema
});

// Game status
export const GameStatusSchema = z.enum(['in-progress', 'won', 'draw']);

// Complete game state
export const TicTacToeStateSchema = z.object({
  version: z.literal('1.0.0'),
  gameId: GameIdSchema,

  // Board state
  board: BoardSchema,
  currentTurn: z.number().int().min(1).max(9),
  currentPlayer: PlayerNumberSchema,

  // Move history
  moves: z.array(MoveSchema),

  // Game outcome
  winner: PlayerNumberSchema.nullable(),
  winningPattern: z.array(z.string()).nullable(),  // ['pos-0', 'pos-4', 'pos-8']
  status: GameStatusSchema,

  // State integrity
  checksum: z.string(),  // SHA-256 hash

  // Timestamps
  createdAt: DateTimeSchema,
  lastMove: DateTimeSchema,

  // Optional features
  socialFeatures: z.object({
    messageFrom: z.enum(['p1', 'p2']).optional(),
    message: z.string().max(200).optional()
  }).optional(),

  previousGameResults: z.any().optional()  // For rematch functionality
});

export type TicTacToeState = z.infer<typeof TicTacToeStateSchema>;

/**
 * Create empty board (9 nulls)
 */
export function createEmptyBoard(): (string | null)[] {
  return Array(9).fill(null);
}

/**
 * Create new game state
 */
export function createNewTicTacToeGame(gameId: string): TicTacToeState {
  return {
    version: '1.0.0',
    gameId,
    board: createEmptyBoard(),
    currentTurn: 1,
    currentPlayer: 1,
    moves: [],
    winner: null,
    winningPattern: null,
    status: 'in-progress',
    checksum: '',  // Will be calculated after creation
    createdAt: new Date().toISOString(),
    lastMove: new Date().toISOString()
  };
}
```

**Validation**:
```bash
npm run type-check
npm run test -- ticTacToeSchema.test.ts
```

---

#### Task 1.3: CREATE src/games/tic-tac-toe/hooks/useTicTacToeGame.ts

**Purpose**: Game logic hook encapsulating board state and moves

```typescript
import { useState, useCallback } from 'react';
import type { TicTacToeState } from '../schemas/ticTacToeSchema';
import { createNewTicTacToeGame } from '../schemas/ticTacToeSchema';
import { checkWinCondition, checkDrawCondition } from '../../../framework/core/engine/winDetector';
import { validateMove } from '../../../framework/core/engine/boardValidator';
import { calculateBoardChecksum } from '../../../framework/utils/checksumDelta';
import type { GameConfig } from '../../../framework/core/config/types';

export interface UseTicTacToeGameResult {
  gameState: TicTacToeState | null;
  initializeGame: () => void;
  makeMove: (position: string) => Promise<void>;
  resetGame: () => void;
  loadGame: (state: TicTacToeState) => void;
}

export function useTicTacToeGame(config: GameConfig): UseTicTacToeGameResult {
  const [gameState, setGameState] = useState<TicTacToeState | null>(null);

  /**
   * Initialize new game
   */
  const initializeGame = useCallback(() => {
    const gameId = crypto.randomUUID();
    const newGame = createNewTicTacToeGame(gameId);

    // Calculate initial checksum (empty board)
    calculateBoardChecksum(newGame.board).then(checksum => {
      newGame.checksum = checksum;
      setGameState(newGame);
    });
  }, []);

  /**
   * Make move (place X or O)
   */
  const makeMove = useCallback(async (position: string) => {
    if (!gameState || gameState.status !== 'in-progress') return;

    // Validate move
    const validation = validateMove(position, gameState.board, gameState.currentPlayer);
    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid move');
    }

    // Verify current state checksum (detect tampering)
    const currentChecksum = await calculateBoardChecksum(gameState.board);
    if (currentChecksum !== gameState.checksum) {
      throw new Error('Game state corrupted - checksum mismatch');
    }

    // Apply move
    const newBoard = [...gameState.board];
    const index = parseInt(position.split('-')[1]);
    const playerSymbol = config.players[gameState.currentPlayer - 1].symbol;
    newBoard[index] = playerSymbol;

    // Calculate new checksum
    const newChecksum = await calculateBoardChecksum(newBoard);

    // Check win condition
    const winResult = checkWinCondition(newBoard, playerSymbol, config);

    // Check draw condition
    const isDraw = !winResult.won && checkDrawCondition(newBoard);

    // Create move record
    const move = {
      player: gameState.currentPlayer,
      position,
      turn: gameState.currentTurn,
      timestamp: new Date().toISOString()
    };

    // Update state
    const newState: TicTacToeState = {
      ...gameState,
      board: newBoard,
      currentTurn: gameState.currentTurn + 1,
      currentPlayer: (gameState.currentPlayer === 1 ? 2 : 1) as 1 | 2,
      moves: [...gameState.moves, move],
      winner: winResult.won ? gameState.currentPlayer : null,
      winningPattern: winResult.pattern,
      status: winResult.won ? 'won' : isDraw ? 'draw' : 'in-progress',
      checksum: newChecksum,
      lastMove: new Date().toISOString()
    };

    setGameState(newState);
  }, [gameState, config]);

  /**
   * Reset to new game
   */
  const resetGame = useCallback(() => {
    setGameState(null);
  }, []);

  /**
   * Load game from URL/localStorage
   */
  const loadGame = useCallback((state: TicTacToeState) => {
    setGameState(state);
  }, []);

  return {
    gameState,
    initializeGame,
    makeMove,
    resetGame,
    loadGame
  };
}
```

**Validation**:
```bash
npm run test -- useTicTacToeGame.test.ts
```

---

### Phase 2: React Components

**Goal**: Create UI components for board visualization and interaction

#### Task 2.1: CREATE src/games/tic-tac-toe/components/TicTacToeBoard.tsx

**Purpose**: 3x3 grid component with cell rendering

```typescript
import { ReactElement } from 'react';
import type { TicTacToeState } from '../schemas/ticTacToeSchema';

export interface TicTacToeBoardProps {
  gameState: TicTacToeState;
  onCellClick: (position: string) => void;
  disabled: boolean;
  winningPattern: string[] | null;
}

/**
 * Tic-Tac-Toe board component
 * Renders 3x3 grid with cells
 */
export function TicTacToeBoard({
  gameState,
  onCellClick,
  disabled,
  winningPattern
}: TicTacToeBoardProps): ReactElement {
  return (
    <div style={styles.board}>
      {gameState.board.map((cell, index) => {
        const posId = `pos-${index}`;
        const isWinning = winningPattern?.includes(posId) || false;
        const isEmpty = cell === null;
        const isClickable = !disabled && isEmpty;

        return (
          <button
            key={posId}
            onClick={() => isClickable && onCellClick(posId)}
            disabled={!isClickable}
            style={{
              ...styles.cell,
              ...(isWinning && styles.winningCell),
              ...(isClickable && styles.clickableCell)
            }}
            aria-label={`Position ${index + 1}${cell ? ` - ${cell}` : ' - empty'}`}
          >
            {cell && <span style={styles.symbol}>{cell}</span>}
          </button>
        );
      })}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  board: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gridTemplateRows: 'repeat(3, 1fr)',
    gap: '8px',
    width: '320px',
    height: '320px',
    margin: '0 auto',
    padding: '16px',
    backgroundColor: '#2c3e50',
    borderRadius: '12px',
    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
  },

  cell: {
    backgroundColor: '#ecf0f1',
    border: 'none',
    borderRadius: '8px',
    fontSize: '3rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative' as const
  },

  clickableCell: {
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
    ':hover': {
      transform: 'scale(1.05)',
      backgroundColor: '#3498db20'
    }
  },

  winningCell: {
    backgroundColor: '#27ae60',
    animation: 'pulse 0.5s ease-in-out 3',
    boxShadow: '0 0 20px rgba(39, 174, 96, 0.6)'
  },

  symbol: {
    userSelect: 'none' as const,
    pointerEvents: 'none' as const
  }
};
```

**Validation**:
```bash
npm run test -- TicTacToeBoard.test.tsx
```

---

#### Task 2.2: CREATE src/games/tic-tac-toe/components/TicTacToeStatus.tsx

**Purpose**: Display turn, win, draw status

```typescript
import { ReactElement } from 'react';
import type { TicTacToeState } from '../schemas/ticTacToeSchema';
import { Button } from '../../../shared/components/Button';

export interface TicTacToeStatusProps {
  gameState: TicTacToeState;
  onNewGame: () => void;
  showURLCopy?: boolean;
}

export function TicTacToeStatus({
  gameState,
  onNewGame,
  showURLCopy = false
}: TicTacToeStatusProps): ReactElement {
  const { status, currentPlayer, winner, winningPattern } = gameState;

  if (status === 'won') {
    const winnerName = winner === 1 ? 'Player 1 (X)' : 'Player 2 (O)';
    return (
      <div style={styles.container}>
        <h2 style={styles.winTitle}>🎉 {winnerName} Wins!</h2>
        {winningPattern && (
          <p style={styles.subtitle}>
            Winning pattern: {winningPattern.map(p => p.replace('pos-', 'Position ')).join(', ')}
          </p>
        )}
        <Button variant="primary" onClick={onNewGame}>
          Start New Game
        </Button>
      </div>
    );
  }

  if (status === 'draw') {
    return (
      <div style={styles.container}>
        <h2 style={styles.drawTitle}>🤝 It's a Draw!</h2>
        <p style={styles.subtitle}>All positions filled with no winner</p>
        <Button variant="primary" onClick={onNewGame}>
          Start New Game
        </Button>
      </div>
    );
  }

  // In progress
  const currentPlayerName = currentPlayer === 1 ? 'Player 1 (X)' : 'Player 2 (O)';
  return (
    <div style={styles.container}>
      <h2 style={styles.turnTitle}>
        {currentPlayerName}'s Turn
      </h2>
      <p style={styles.subtitle}>
        Turn {gameState.currentTurn} of {gameState.board.length}
      </p>
      {showURLCopy && (
        <p style={styles.instruction}>
          Share the URL with your opponent to continue
        </p>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    textAlign: 'center' as const,
    padding: '24px',
    backgroundColor: '#16213e',
    borderRadius: '12px',
    marginTop: '24px'
  },

  winTitle: {
    fontSize: '2rem',
    color: '#27ae60',
    marginBottom: '16px'
  },

  drawTitle: {
    fontSize: '2rem',
    color: '#f39c12',
    marginBottom: '16px'
  },

  turnTitle: {
    fontSize: '1.5rem',
    color: '#3498db',
    marginBottom: '8px'
  },

  subtitle: {
    fontSize: '1rem',
    color: '#bbb',
    marginBottom: '16px'
  },

  instruction: {
    fontSize: '0.9rem',
    color: '#f39c12',
    fontStyle: 'italic' as const,
    marginTop: '16px'
  }
};
```

---

### Phase 3: Integration & Testing

**Goal**: Integrate components with App.tsx and create comprehensive tests

#### Task 3.1: MODIFY src/App.tsx

**Purpose**: Add Tic-Tac-Toe as selectable game

**Changes**:
1. Import Tic-Tac-Toe components and config
2. Add game selection dropdown
3. Route to appropriate game based on selection
4. Preserve existing Prisoner's Dilemma functionality

**Key Pattern**:
```typescript
// At top level
const [selectedGame, setSelectedGame] = useState<'prisoners-dilemma' | 'tic-tac-toe'>('prisoners-dilemma');

// Conditional rendering based on selectedGame
{selectedGame === 'tic-tac-toe' ? (
  <TicTacToeBoard gameState={ticTacToeState} ... />
) : (
  <GameBoard gameState={prisonersDilemmaState} ... />
)}
```

**Validation**:
```bash
npm run dev
# Manual testing: Select game, play through, verify URL sharing
```

---

#### Task 3.2: CREATE Integration Tests

**Files**:
- `src/games/tic-tac-toe/integration/gameplay.integration.test.ts`
- `src/games/tic-tac-toe/integration/urlSharing.integration.test.ts`

**Test Scenarios**:
1. Complete game to X win
2. Complete game to O win
3. Complete game to draw
4. URL sharing between players
5. Choice locking verification
6. Checksum verification
7. Tampered URL detection
8. Out-of-sync state handling

**Example**:
```typescript
import { test, expect } from '@playwright/test';

test('should complete full Tic-Tac-Toe game to X win', async ({ page, context }) => {
  // Player 1 starts game
  await page.goto('/');
  await page.selectOption('[name="game-select"]', 'tic-tac-toe');
  await page.click('button:has-text("Start Game")');

  // P1 clicks center (pos-4)
  await page.click('[aria-label="Position 5 - empty"]');
  await expect(page.locator('[aria-label="Position 5 - ❌"]')).toBeVisible();

  // Get URL for P2
  const urlForP2 = await page.evaluate(() => window.location.href);

  // P2 opens URL
  const p2Page = await context.newPage();
  await p2Page.goto(urlForP2);
  await expect(p2Page.locator('[aria-label="Position 5 - ❌"]')).toBeVisible();

  // P2 clicks top-left (pos-0)
  await p2Page.click('[aria-label="Position 1 - empty"]');
  const urlForP1 = await p2Page.evaluate(() => window.location.href);

  // Continue until X wins (pos-4, pos-2, pos-8 = diagonal)
  // ... additional moves ...

  // Verify win state
  await expect(page.getByText(/Player 1 \(X\) Wins!/i)).toBeVisible();
  await expect(page.getByText(/Winning pattern/i)).toBeVisible();
});
```

**Validation**:
```bash
npm run test:e2e -- gameplay.integration.test.ts
```

---

## Validation Loop

### Level 1: Syntax & Style (After Each File)

```bash
# Type check specific file
npm run type-check

# Expected: Zero TypeScript errors

# Format code
npm run format

# Lint (if configured)
npm run lint:fix
```

### Level 2: Unit Tests (After Each Module)

```bash
# Test checksum delta utilities
npm run test -- checksumDelta.test.ts

# Test win detection
npm run test -- winDetector.test.ts

# Test board validation
npm run test -- boardValidator.test.ts

# Test Tic-Tac-Toe schema
npm run test -- ticTacToeSchema.test.ts

# Test game hook
npm run test -- useTicTacToeGame.test.ts

# Test components
npm run test -- TicTacToeBoard.test.tsx

# Expected: All tests pass, >80% coverage
```

### Level 3: Integration Testing (After Phase 2)

```bash
# Start dev server
npm run dev

# Manual Testing Protocol:
# 1. Select Tic-Tac-Toe from dropdown
# 2. Start new game
# 3. Make move as P1 → verify locked
# 4. Copy URL
# 5. Open in incognito → verify P2 view
# 6. Make move as P2 → copy URL
# 7. Return to P1 tab → open new URL
# 8. Complete game to win
# 9. Verify winner message

# E2E Tests
npm run test:e2e

# Expected: All E2E tests pass
```

### Level 4: Full System Validation (Before Merge)

```bash
# Complete validation pipeline
npm run validate
# Runs: type-check && lint && test:coverage

# Build for production
npm run build

# Preview build
npm run preview

# Test all games:
# 1. Prisoner's Dilemma - complete 5 rounds
# 2. Rock-Paper-Scissors - complete 3 rounds
# 3. Tic-Tac-Toe - play to win and draw

# Expected:
# ✅ All validation passes
# ✅ Build succeeds
# ✅ All 3 games work end-to-end
# ✅ URLs are 70-80% smaller
# ✅ Checksum verification working
```

---

## Final Validation Checklist

### Technical Validation

- [ ] All validation levels completed successfully
- [ ] `npm run validate` passes with zero errors
- [ ] `npm run build` succeeds
- [ ] No TypeScript errors in strict mode
- [ ] All tests pass: `npm run test`
- [ ] E2E tests pass: `npm run test:e2e`
- [ ] Test coverage >80%

### Feature Validation

- [ ] Tic-Tac-Toe loads from YAML config
- [ ] 3x3 board renders correctly
- [ ] Players can alternate moves
- [ ] Choice locking prevents changing moves
- [ ] Win detection works for all 8 patterns
- [ ] Draw detection when board full
- [ ] Delta URLs generated correctly
- [ ] Checksum verification working
- [ ] HMAC tamper detection working
- [ ] URLs 70-80% smaller than before
- [ ] Game history saves completed games

### Framework Validation

- [ ] Prisoner's Dilemma updated to delta URLs
- [ ] Prisoner's Dilemma tested end-to-end (5 rounds)
- [ ] Rock-Paper-Scissors updated to delta URLs
- [ ] Rock-Paper-Scissors tested end-to-end (3 rounds)
- [ ] Old URL format shows migration message
- [ ] Framework documentation updated

### Code Quality Validation

- [ ] Follows existing codebase patterns
- [ ] No hardcoded values (use config)
- [ ] Error messages are clear and helpful
- [ ] JSDoc comments on public functions
- [ ] No `any` types (TypeScript strict)
- [ ] Immutable state updates throughout

---

## Anti-Patterns to Avoid

- ❌ **Don't mutate board arrays** - Always create new arrays with `[...board]`
- ❌ **Don't skip checksum verification** - Critical for state integrity
- ❌ **Don't trust external data** - Always validate with Zod
- ❌ **Don't include timestamps in checksums** - Makes them non-deterministic
- ❌ **Don't verify HMAC after decryption** - Security vulnerability
- ❌ **Don't use synchronous crypto operations** - Always `await` crypto.subtle
- ❌ **Don't forget to update choice lock keys** - Change from round to turn format
- ❌ **Don't catch all exceptions** - Be specific with error handling
- ❌ **Don't skip integration testing** - Manual testing required for game flow
- ❌ **Don't commit without validating all games** - Regression testing essential

---

## Success Metrics

**Confidence Score**: 9/10 for one-pass implementation success

**Reasoning**:
- ✅ Complete codebase analysis with exact file paths
- ✅ All patterns documented from similar implementation (Prisoner's Dilemma)
- ✅ Framework extension points identified
- ✅ Testing patterns established
- ✅ Validation loops comprehensive
- ✅ Breaking changes documented with migration path
- ⚠️ External documentation research limited (session limit) - using codebase patterns instead

**Risk Mitigation**:
- Comprehensive analysis documents in `PRPs/ai_docs/` provide fallback context
- PRD includes complete specifications
- Codebase patterns cover 90%+ of needed patterns
- Testing strategy ensures quality gates

---

## Additional Notes

**Breaking Changes Philosophy**: This implementation intentionally introduces breaking changes that improve the framework architecture. The delta-based URL + checksum approach benefits all games, not just Tic-Tac-Toe.

**Migration Strategy**: Update existing games (Prisoner's Dilemma, Rock-Paper-Scissors) as part of this implementation to ensure they work with the new architecture. Test all games before merging.

**Future Sequential Games**: The patterns established here (win detection, board validation, sequential turns) will enable future games like Connect Four, Battleship, or Chess with minimal additional framework changes.

**URL Size Comparison**:
- Current (full state): ~350+ characters
- New (delta): ~60-100 characters
- Reduction: 70-80%

**Security Layers**:
1. HMAC (URL tampering)
2. Checksum prev (state consistency before move)
3. Checksum new (state consistency after move)
4. Choice lock (prevent player changing own move)
5. Zod validation (external data safety)

---

**PRP Status**: Ready for Execution
**Created**: 2025-10-09
**Author**: Claude Code (AI Assistant)
**Estimated Implementation Time**: 6-10 hours