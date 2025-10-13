# BASE PRP: Counting Game Implementation

**Status**: Ready for execution
**Confidence Score**: 9/10
**Created**: 2025-10-13
**Framework Version**: 1.2.0

---

## Goal

Implement a complete correspondence-style Counting Game where two players take turns incrementing a count, with real-time input validation and a voluntary give-up mechanism. The implementation must follow the Correspondence Games Framework patterns, support both hot-seat and URL modes with a unified state machine, include comprehensive tests, and have full dark mode support.

---

## Why (Business Value & User Impact)

### User Value
- **Simple to learn**: Count upwards - anyone can understand the rules instantly
- **Test of endurance**: Who can concentrate longer without making a mistake?
- **Fair competition**: Equal challenge for both players (no luck, no strategy advantage)
- **Graceful exit**: Players can give up honorably when tired
- **Share anywhere**: URL mode enables remote play via any messaging app

### Technical Value
- **Framework validation**: Tests the framework's ability to handle real-time input validation
- **New pattern**: "Give up" mechanism + game over handoff is unique to this game
- **Reference implementation**: Demonstrates input validation best practices
- **Test coverage**: Proves framework patterns work for non-board games

### Business Impact
- Demonstrates framework flexibility beyond grid-based games
- Provides template for future input-based games
- Tests framework's ability to handle unique win conditions

---

## What (User-Visible Behavior)

### Game Rules
1. Game starts at count 0
2. Player 1 must type "1" and confirm
3. Player 2 must type "2" and confirm
4. Count increments: 3, 4, 5, ...
5. Any player can click "Give Up" to end the game
6. When a player gives up, opponent wins
7. Final result is shared via handoff (hot-seat) or URL (URL mode)

### Key Features
- **Real-time validation**: Input field provides immediate feedback
- **Smart confirm button**: Only enabled when correct number is typed
- **Clear error messages**: "Expected 5" if user types wrong number
- **Give up anytime**: Button always available during player's turn
- **No mistakes needed**: Game doesn't track mistakes - players decide when to give up
- **Final handoff**: Winner sees result and can share it

### User Experience Requirements
- Input validation responds within 100ms of keystroke
- Error messages are helpful, not punitive
- "Give Up" button is clearly labeled and always accessible
- Dark mode works perfectly (mandatory)
- Mobile-friendly (framework provides responsive design)

---

## All Needed Context

### 1. Framework Documentation

**CRITICAL**: Read these documents BEFORE implementing:

1. **STATE_DIAGRAM_TEMPLATE.md** (`/packages/core/STATE_DIAGRAM_TEMPLATE.md`)
   - Defines unified state machine pattern
   - Single flow for both hot-seat and URL modes
   - Mode differences are UI-only, NOT logic
   - State machine states: Player1Name → ModeSelection → PreGame → MyTurn → MoveSelected → Handoff → Player2NamePrompt → TheirTurn → GameOver

2. **NAME_COLLECTION_PATTERN.md** (`/packages/core/NAME_COLLECTION_PATTERN.md`)
   - Use styled HTML forms, NOT JavaScript `prompt()`
   - Use framework classes: `cg-form`, `cg-form-input`, `cg-button`
   - Form submission with FormData
   - Required validation, maxLength={20}, autoFocus

3. **DARK_MODE_GUIDE.md** (`/packages/core/DARK_MODE_GUIDE.md`)
   - MANDATORY: Every element needs `@media (prefers-color-scheme: dark)`
   - Use framework CSS variables or manual dark mode blocks
   - Test in both light and dark modes

4. **NEW_GAME_GUIDE.md** (`/packages/core/NEW_GAME_GUIDE.md`)
   - Complete blueprint for creating new games
   - Schema-first design, storage patterns, URL encoding
   - Testing requirements (unit + integration)

5. **FRAMEWORK_UPDATES.md** (`/packages/core/FRAMEWORK_UPDATES.md`)
   - Latest framework changes and patterns
   - Version 1.2.0 notes (October 2025)

### 2. External Dependencies

**Zod** (Schema Validation)
- **Documentation**: https://zod.dev/ (see also `/PRPs/ai_docs/zod_patterns.md`)
- **Usage**: Schema-first design with TypeScript type inference
- **Pattern**: Define schemas, export types with `z.infer<typeof Schema>`
- **Key APIs**:
  - `z.string().uuid()` - UUID validation
  - `z.number().int().min(0)` - Integer validation
  - `z.enum(['playing', 'player1_wins', 'player2_wins'])` - Status enums
  - `z.object({ ... })` - Object schemas
  - `schema.parse(data)` - Throws on invalid
  - `schema.safeParse(data)` - Returns {success, data} or {success, error}

**lz-string** (URL Compression)
- **Documentation**: https://pieroxy.net/blog/pages/lz-string/index.html (see also `/PRPs/ai_docs/lz-string_patterns.md`)
- **Usage**: Compress game state for URL sharing
- **Critical APIs**:
  - `LZString.compressToEncodedURIComponent(jsonString)` - URL-safe compression
  - `LZString.decompressFromEncodedURIComponent(compressed)` - Returns string or `null`
- **GOTCHA**: Always check for `null` return from decompress - it means invalid data

**Vitest** (Testing Framework)
- **Documentation**: https://vitest.dev/
- **Usage**: Unit and integration tests with React Testing Library
- **Key APIs**:
  - `describe(name, fn)` - Test suite
  - `it(name, fn)` - Test case
  - `expect(value).toBe(expected)` - Assertion
  - `vi.mock(module)` - Module mocking
  - `beforeEach(fn)` - Setup

**React Testing Library**
- **Documentation**: https://testing-library.com/docs/react-testing-library/intro/
- **Usage**: Component integration tests
- **Key APIs**:
  - `render(<Component />)` - Render component
  - `screen.getByText(text)` - Query by text
  - `fireEvent.click(element)` - Simulate user interaction
  - `waitFor(() => expect(...))` - Async assertions

### 3. Existing Game Patterns (Tic-Tac-Toe Analysis)

**File Structure Pattern:**
```
Core Library: /packages/core/src/lib/[game]-{schema|logic|storage|url-encoder|delta|checksum}.ts
Core Tests: /packages/core/__tests__/[game]-{module}.test.ts
Game App: /games/[game-name]/src/App.{tsx|css|test.tsx}
```

**State Machine Pattern (from tic-tac-toe):**
```typescript
function App() {
  // State declarations
  const [player1Name, setPlayer1Name] = useState<string | null>(null);
  const [player2Name, setPlayer2Name] = useState<string | null>(null);
  const [gameMode, setGameMode] = useState<'hotseat' | 'url' | null>(null);
  const [gameState, setGameState] = useState<TicTacToeState | null>(null);

  // Early returns for each state
  if (!player1Name) return <Player1NameForm />;
  if (!gameMode) return <ModeSelection />;
  if (!gameState) return <PreGame />;
  if (gameState.status !== 'playing') return <GameOver />;
  if (gameState.currentPlayer !== myPlayerNumber) return <TheirTurn />;

  return <MyTurn />;
}
```

**localStorage Pattern:**
```typescript
// Hot-seat mode: separate keys per player
hotSeatStorage.setPlayer1Name(name); // 'correspondence-games:player1-name'
hotSeatStorage.setPlayer2Name(name); // 'correspondence-games:player2-name'

// URL mode: single identity across games
hotSeatStorage.setMyName(name); // 'correspondence-games:my-name'
hotSeatStorage.getMyPlayerId(); // Generates UUID if not exists
```

**URL Encoding Pattern:**
```typescript
// Full state (first move)
const encoded = await encodeFullGameState(state);
const url = `${window.location.origin}/?state=${encoded}`;

// Delta (subsequent moves)
const delta = await encodeDelta(previousState, move, secret);
const url = `${window.location.origin}/?delta=${delta}`;
```

**Checksum Pattern:**
```typescript
// Generate (returns hex string)
const checksum = await generateChecksum(stateWithoutChecksum);
const fullState = { ...stateWithoutChecksum, checksum };

// Validate
const isValid = await validateChecksum(fullState);
if (!isValid) throw new Error('Checksum validation failed');
```

**Dark Mode Pattern:**
```css
.element {
  color: #333;
  background: #ffffff;
  border: 1px solid #ddd;
}

@media (prefers-color-scheme: dark) {
  .element {
    color: #e0e0e0;
    background: #1e1e1e;
    border-color: #444;
  }
}
```

**Test Pattern:**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';

describe('Module Name', () => {
  beforeEach(() => {
    // Reset state
  });

  describe('functionName', () => {
    it('should handle valid input', () => {
      // Arrange
      const input = validInput;

      // Act
      const result = functionName(input);

      // Assert
      expect(result).toBe(expectedOutput);
    });

    it('should reject invalid input', () => {
      expect(() => functionName(invalidInput)).toThrow();
    });
  });
});
```

### 4. Game-Specific Requirements

**Input Validation Logic:**
```typescript
function validateMove(input: string, currentCount: number): {
  valid: boolean;
  number?: number;
  error?: string;
} {
  // Trim whitespace
  const trimmed = input.trim();
  if (trimmed === '') {
    return { valid: false, error: 'Please enter a number' };
  }

  // Parse as integer
  const parsed = parseInt(trimmed, 10);
  if (isNaN(parsed)) {
    return { valid: false, error: 'Not a valid number' };
  }

  // Check for leading zeros: "01" should be rejected
  if (parsed.toString() !== trimmed) {
    return { valid: false, error: 'Must be whole number without leading zeros' };
  }

  // Must be positive
  if (parsed <= 0) {
    return { valid: false, error: 'Must be positive' };
  }

  // Check expected number
  const expectedNumber = currentCount + 1;
  if (parsed !== expectedNumber) {
    return { valid: false, error: `Expected ${expectedNumber}` };
  }

  return { valid: true, number: parsed };
}
```

**Give Up Logic:**
```typescript
function handleGiveUp(
  gameState: CountingGameState,
  playerWhoGaveUp: 1 | 2
): Omit<CountingGameState, 'checksum'> {
  const winner = playerWhoGaveUp === 1 ? 2 : 1;
  return {
    ...gameState,
    status: winner === 1 ? 'player1_wins' : 'player2_wins',
    // NOTE: Do NOT increment currentTurn or currentCount
  };
}
```

**Real-Time Input Validation (React):**
```typescript
const [inputValue, setInputValue] = useState<string>('');
const [inputValid, setInputValid] = useState<boolean>(false);
const [inputError, setInputError] = useState<string>('');

const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const value = e.target.value;
  setInputValue(value);

  const validation = validateMove(value, gameState.currentCount);
  setInputValid(validation.valid);
  setInputError(validation.error || '');
};

return (
  <>
    <input
      type="text"
      value={inputValue}
      onChange={handleInputChange}
      className={inputValid ? 'valid' : inputError ? 'invalid' : ''}
    />
    {inputError && <p className="error">{inputError}</p>}
    <button disabled={!inputValid} onClick={handleConfirm}>
      Confirm
    </button>
  </>
);
```

**Game Over → Handoff Flow:**
```typescript
// In GameOver component
if (gameMode === 'url') {
  // Generate final URL with game over state
  const finalUrl = await generateGameUrl(gameState, window.location.origin);
  setShareUrl(finalUrl);

  return (
    <div>
      <h2>{winnerName} Wins!</h2>
      <p>Final count: {gameState.currentCount}</p>
      <div className="url-section">
        <label>Share result with opponent:</label>
        <input value={finalUrl} readOnly />
        <button onClick={copyToClipboard}>Copy URL</button>
      </div>
    </div>
  );
}

// Hot-seat mode
return (
  <div>
    <h2>{winnerName} Wins!</h2>
    <p>Final count: {gameState.currentCount}</p>
    <button onClick={() => {/* Show result to opponent */}}>
      Pass Device to {opponentName}
    </button>
  </div>
);
```

### 5. Schema Design

**CountingGameState Schema:**
```typescript
import { z } from 'zod';

export const CountingGameStateSchema = z.object({
  gameId: z.string().uuid(),
  currentCount: z.number().int().min(0),
  currentTurn: z.number().int().min(0),
  currentPlayer: z.enum(['1', '2']),
  player1: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(20),
  }),
  player2: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(20),
  }),
  status: z.enum(['playing', 'player1_wins', 'player2_wins']),
  checksum: z.string(),
});

export type CountingGameState = z.infer<typeof CountingGameStateSchema>;
```

**CountingMove Schema:**
```typescript
export const CountingMoveSchema = z.object({
  number: z.number().int().positive(),
  timestamp: z.string().datetime(),
});

export type CountingMove = z.infer<typeof CountingMoveSchema>;
```

**CountingDelta Schema:**
```typescript
export const CountingDeltaSchema = z.object({
  gameId: z.string().uuid(),
  currentTurn: z.number().int().min(0),
  move: CountingMoveSchema,
  signature: z.string(), // HMAC signature
});

export type CountingDelta = z.infer<typeof CountingDeltaSchema>;
```

### 6. Known Gotchas & Anti-Patterns

**GOTCHA #1: Leading Zeros**
```typescript
// WRONG: parseInt("01") === 1 (true)
if (parsed === expectedNumber) return true;

// CORRECT: Check string representation
if (parsed.toString() !== trimmed) {
  return { valid: false, error: 'No leading zeros' };
}
```

**GOTCHA #2: Give Up Doesn't Increment Turn**
```typescript
// WRONG: Incrementing turn after give up
function handleGiveUp(state) {
  return { ...state, currentTurn: state.currentTurn + 1, status: 'player1_wins' };
}

// CORRECT: Game ends at current state
function handleGiveUp(state, playerWhoGaveUp) {
  return { ...state, status: winner === 1 ? 'player1_wins' : 'player2_wins' };
  // No currentTurn or currentCount modification!
}
```

**GOTCHA #3: Game Over Must Generate URL**
```typescript
// WRONG: Not generating URL after game over
if (gameState.status !== 'playing') {
  return <div>Game Over!</div>;
}

// CORRECT: Generate final URL for opponent to see result
if (gameState.status !== 'playing') {
  if (gameMode === 'url' && !shareUrl) {
    generateGameUrl(gameState).then(setShareUrl);
  }
  return <GameOverWithURLSharing />;
}
```

**GOTCHA #4: LZ-String Returns Null**
```typescript
// WRONG: Not checking for null
const decompressed = LZString.decompressFromEncodedURIComponent(data);
const parsed = JSON.parse(decompressed); // TypeError if null!

// CORRECT: Always check for null
const decompressed = LZString.decompressFromEncodedURIComponent(data);
if (decompressed === null) return null;
const parsed = JSON.parse(decompressed);
```

**GOTCHA #5: Checksum Must Be Deterministic**
```typescript
// WRONG: Using Math.random() or Date.now() in canonical JSON
const canonical = JSON.stringify(state); // Object key order not guaranteed!

// CORRECT: Sort keys recursively
function objectToCanonicalJson(obj: unknown): string {
  if (typeof obj !== 'object' || obj === null) return JSON.stringify(obj);
  if (Array.isArray(obj)) return `[${obj.map(objectToCanonicalJson).join(',')}]`;

  const sorted = Object.keys(obj)
    .sort()
    .map(key => `"${key}":${objectToCanonicalJson((obj as any)[key])}`)
    .join(',');
  return `{${sorted}}`;
}
```

**ANTI-PATTERN #1: Validating Move After Confirmation**
```typescript
// WRONG: User clicks confirm, THEN you validate
const handleConfirm = () => {
  if (!validateMove(inputValue, currentCount).valid) {
    alert('Invalid number!');
    return;
  }
  // Too late - button should have been disabled
};

// CORRECT: Validate on every keystroke, disable button
const handleInputChange = (e) => {
  const value = e.target.value;
  setInputValue(value);
  const validation = validateMove(value, currentCount);
  setInputValid(validation.valid);
};
```

**ANTI-PATTERN #2: Using prompt() for Names**
```typescript
// WRONG: Not styleable, no dark mode
const name = prompt('Enter your name:');

// CORRECT: Styled form with framework classes
<form onSubmit={handleSubmit} className="cg-form">
  <label className="cg-form-label">Enter your name:</label>
  <input type="text" className="cg-form-input" required maxLength={20} />
  <button className="cg-button cg-button-primary">Continue</button>
</form>
```

**ANTI-PATTERN #3: Separate State Machines for Each Mode**
```typescript
// WRONG: Duplicated logic
if (gameMode === 'hotseat') {
  // Separate state machine
} else {
  // Different state machine
}

// CORRECT: Unified state machine, UI differences only
const confirmButtonText = gameMode === 'hotseat'
  ? 'Confirm & Pass Device'
  : 'Confirm & Generate URL';
```

---

## Implementation Blueprint

### Phase 1: Core Library Modules (Sequential)

#### 1.1: counting-schema.ts (~120 lines)

**Location**: `/packages/core/src/lib/counting-schema.ts`

**Purpose**: Define all Zod schemas and TypeScript types

**Implementation**:
```typescript
import { z } from 'zod';

// Game State Schema
export const CountingGameStateSchema = z.object({
  gameId: z.string().uuid(),
  currentCount: z.number().int().min(0),
  currentTurn: z.number().int().min(0),
  currentPlayer: z.enum(['1', '2']),
  player1: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(20),
  }),
  player2: z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(20),
  }),
  status: z.enum(['playing', 'player1_wins', 'player2_wins']),
  checksum: z.string(),
});

export type CountingGameState = z.infer<typeof CountingGameStateSchema>;

// Move Schema
export const CountingMoveSchema = z.object({
  number: z.number().int().positive(),
  timestamp: z.string().datetime(),
});

export type CountingMove = z.infer<typeof CountingMoveSchema>;

// Delta Schema (for URL encoding)
export const CountingDeltaSchema = z.object({
  gameId: z.string().uuid(),
  currentTurn: z.number().int().min(0),
  move: CountingMoveSchema,
  signature: z.string(), // HMAC for tamper detection
});

export type CountingDelta = z.infer<typeof CountingDeltaSchema>;

// Validation Result (for input validation)
export type ValidationResult = {
  valid: boolean;
  number?: number;
  error?: string;
};
```

**Validation**:
```bash
cd packages/core
npm run build
# Should compile without errors
```

---

#### 1.2: counting-logic.ts (~200 lines)

**Location**: `/packages/core/src/lib/counting-logic.ts`

**Purpose**: Pure functions for game logic

**Implementation**:
```typescript
import type { CountingGameState, CountingMove, ValidationResult } from './counting-schema';

/**
 * Create initial game state
 */
export function createInitialGameState(
  gameId: string,
  player1Id: string,
  player1Name: string,
  player2Id: string,
  player2Name: string
): Omit<CountingGameState, 'checksum'> {
  return {
    gameId,
    currentCount: 0,
    currentTurn: 0,
    currentPlayer: '1',
    player1: { id: player1Id, name: player1Name },
    player2: { id: player2Id, name: player2Name },
    status: 'playing',
  };
}

/**
 * Validate move input in real-time
 *
 * CRITICAL: This runs on EVERY keystroke - must be fast
 */
export function validateMove(
  input: string,
  currentCount: number
): ValidationResult {
  // Trim whitespace
  const trimmed = input.trim();

  // Empty input
  if (trimmed === '') {
    return { valid: false, error: 'Please enter a number' };
  }

  // Parse as integer
  const parsed = parseInt(trimmed, 10);

  // Not a number
  if (isNaN(parsed)) {
    return { valid: false, error: 'Not a valid number' };
  }

  // Check for leading zeros or non-integer input
  // "01" -> parseInt("01") === 1, but "1" !== "01"
  if (parsed.toString() !== trimmed) {
    return { valid: false, error: 'Must be whole number without leading zeros' };
  }

  // Must be positive
  if (parsed <= 0) {
    return { valid: false, error: 'Must be positive' };
  }

  // Check expected number
  const expectedNumber = currentCount + 1;
  if (parsed !== expectedNumber) {
    return { valid: false, error: `Expected ${expectedNumber}` };
  }

  return { valid: true, number: parsed };
}

/**
 * Apply a move to game state
 *
 * NOTE: Does NOT validate move - validation happens in UI
 */
export function applyMove(
  state: CountingGameState,
  move: CountingMove
): Omit<CountingGameState, 'checksum'> {
  // Validate it's the correct player's turn (sanity check)
  // This shouldn't happen in UI, but protect against tampering

  return {
    ...state,
    currentCount: move.number,
    currentTurn: state.currentTurn + 1,
    currentPlayer: state.currentPlayer === '1' ? '2' : '1',
  };
}

/**
 * Handle player giving up
 *
 * CRITICAL: Does NOT increment turn or count - game ends at current state
 */
export function handleGiveUp(
  state: CountingGameState,
  playerWhoGaveUp: 1 | 2
): Omit<CountingGameState, 'checksum'> {
  const winner = playerWhoGaveUp === 1 ? 2 : 1;

  return {
    ...state,
    status: winner === 1 ? 'player1_wins' : 'player2_wins',
    // NOTE: currentTurn and currentCount remain unchanged
  };
}

/**
 * Get human-readable game status
 */
export function getGameStatus(state: CountingGameState): {
  status: string;
  winner?: 1 | 2;
  winnerName?: string;
  finalCount: number;
} {
  const finalCount = state.currentCount;

  if (state.status === 'playing') {
    return { status: 'In progress', finalCount };
  }

  if (state.status === 'player1_wins') {
    return {
      status: 'Game Over',
      winner: 1,
      winnerName: state.player1.name,
      finalCount,
    };
  }

  if (state.status === 'player2_wins') {
    return {
      status: 'Game Over',
      winner: 2,
      winnerName: state.player2.name,
      finalCount,
    };
  }

  return { status: 'Unknown', finalCount };
}

/**
 * Check if it's a specific player's turn
 */
export function isPlayerTurn(
  state: CountingGameState,
  playerNumber: 1 | 2
): boolean {
  return state.currentPlayer === playerNumber.toString();
}

/**
 * Get opponent's player number
 */
export function getOpponentPlayerNumber(playerNumber: 1 | 2): 1 | 2 {
  return playerNumber === 1 ? 2 : 1;
}
```

**Validation**:
```bash
npm test -- counting-logic.test.ts
```

---

#### 1.3: counting-storage.ts (~150 lines)

**Location**: `/packages/core/src/lib/counting-storage.ts`

**Purpose**: localStorage abstraction with validation

**Implementation**:
```typescript
import { CountingGameState, CountingGameStateSchema } from './counting-schema';
import { v4 as uuidv4 } from 'uuid';

// Storage keys
const COUNTING_GAME_STATE_KEY = 'counting-game:game-state';
const MY_NAME_KEY = 'correspondence-games:my-name';
const MY_PLAYER_ID_KEY = 'correspondence-games:my-player-id';
const PLAYER1_NAME_KEY = 'correspondence-games:player1-name';
const PLAYER2_NAME_KEY = 'correspondence-games:player2-name';

/**
 * Save game state to localStorage
 * Validates before saving
 */
export function saveGameState(state: CountingGameState): void {
  try {
    // Validate with schema
    const validated = CountingGameStateSchema.parse(state);

    // Serialize and save
    const json = JSON.stringify(validated);
    localStorage.setItem(COUNTING_GAME_STATE_KEY, json);
  } catch (error) {
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      console.error('localStorage quota exceeded');
      throw new Error('Storage quota exceeded. Please clear browser data.');
    }
    throw error;
  }
}

/**
 * Load game state from localStorage
 * Returns null if not found or invalid
 */
export function loadGameState(): CountingGameState | null {
  try {
    const json = localStorage.getItem(COUNTING_GAME_STATE_KEY);
    if (!json) return null;

    const parsed = JSON.parse(json);

    // Validate with Zod schema
    const result = CountingGameStateSchema.safeParse(parsed);
    if (!result.success) {
      console.error('Invalid game state in localStorage', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error loading game state', error);
    return null;
  }
}

/**
 * Clear game state from localStorage
 */
export function clearGameState(): void {
  localStorage.removeItem(COUNTING_GAME_STATE_KEY);
}

/**
 * Get current player's name (URL mode)
 */
export function getMyName(): string | null {
  return localStorage.getItem(MY_NAME_KEY);
}

/**
 * Set current player's name (URL mode)
 */
export function setMyName(name: string): void {
  localStorage.setItem(MY_NAME_KEY, name);
}

/**
 * Get current player's persistent ID
 * Generates and saves UUID if not exists
 */
export function getMyPlayerId(): string {
  let id = localStorage.getItem(MY_PLAYER_ID_KEY);
  if (!id) {
    id = uuidv4();
    localStorage.setItem(MY_PLAYER_ID_KEY, id);
  }
  return id;
}

/**
 * Set current player's persistent ID
 */
export function setMyPlayerId(id: string): void {
  localStorage.setItem(MY_PLAYER_ID_KEY, id);
}

/**
 * Get Player 1's name (hot-seat mode only)
 */
export function getPlayer1Name(): string | null {
  return localStorage.getItem(PLAYER1_NAME_KEY);
}

/**
 * Set Player 1's name (hot-seat mode only)
 */
export function setPlayer1Name(name: string): void {
  localStorage.setItem(PLAYER1_NAME_KEY, name);
}

/**
 * Get Player 2's name (hot-seat mode only)
 */
export function getPlayer2Name(): string | null {
  return localStorage.getItem(PLAYER2_NAME_KEY);
}

/**
 * Set Player 2's name (hot-seat mode only)
 */
export function setPlayer2Name(name: string): void {
  localStorage.setItem(PLAYER2_NAME_KEY, name);
}

/**
 * Clear all player identity data
 */
export function clearAllPlayerData(): void {
  localStorage.removeItem(MY_NAME_KEY);
  localStorage.removeItem(PLAYER1_NAME_KEY);
  localStorage.removeItem(PLAYER2_NAME_KEY);
  clearGameState();
}
```

**Validation**:
```bash
npm test -- counting-storage.test.ts
```

---

#### 1.4: counting-checksum.ts (~80 lines)

**Location**: `/packages/core/src/lib/counting-checksum.ts`

**Purpose**: Generate and validate SHA-256 checksums

**Implementation**:
```typescript
import type { CountingGameState } from './counting-schema';

/**
 * Convert object to canonical JSON (deterministic serialization)
 * Sorts all object keys recursively
 */
function objectToCanonicalJson(obj: unknown): string {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);

  if (Array.isArray(obj)) {
    const items = obj.map(item => objectToCanonicalJson(item));
    return `[${items.join(',')}]`;
  }

  // Sort object keys
  const sortedKeys = Object.keys(obj).sort();
  const pairs = sortedKeys.map(key => {
    const value = objectToCanonicalJson((obj as Record<string, unknown>)[key]);
    return `"${key}":${value}`;
  });

  return `{${pairs.join(',')}}`;
}

/**
 * Generate SHA-256 checksum for game state
 *
 * CRITICAL: Uses canonical JSON for deterministic hashing
 */
export async function generateChecksum(
  state: Omit<CountingGameState, 'checksum'>
): Promise<string> {
  // Create canonical JSON
  const canonical = objectToCanonicalJson(state);

  // Convert to Uint8Array
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);

  // Hash with SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hashHex;
}

/**
 * Validate checksum for game state
 * Returns true if checksum matches, false otherwise
 */
export async function validateChecksum(
  state: CountingGameState
): Promise<boolean> {
  // Extract state without checksum
  const { checksum, ...stateWithoutChecksum } = state;

  // Regenerate checksum
  const expectedChecksum = await generateChecksum(stateWithoutChecksum);

  // Compare
  return checksum === expectedChecksum;
}
```

**Validation**:
```bash
npm test -- counting-checksum.test.ts
```

---

#### 1.5: counting-url-encoder.ts (~180 lines)

**Location**: `/packages/core/src/lib/counting-url-encoder.ts`

**Purpose**: Encode/decode game state for URL sharing

**Implementation**:
```typescript
import * as LZString from 'lz-string';
import {
  CountingGameState,
  CountingGameStateSchema,
} from './counting-schema';
import { validateChecksum } from './counting-checksum';

/**
 * Encode full game state for URL sharing
 *
 * CRITICAL: State must have valid checksum before encoding
 */
export async function encodeFullGameState(
  state: CountingGameState
): Promise<string> {
  // Validate state has checksum
  if (!state.checksum) {
    throw new Error('Cannot encode state without checksum');
  }

  // Validate checksum
  const isValid = await validateChecksum(state);
  if (!isValid) {
    throw new Error('Cannot encode state with invalid checksum');
  }

  // Serialize to JSON
  const json = JSON.stringify(state);

  // Compress with LZ-String
  const compressed = LZString.compressToEncodedURIComponent(json);

  return compressed;
}

/**
 * Decode full game state from URL
 * Returns null if invalid or tampered
 */
export async function decodeFullGameState(
  encoded: string
): Promise<CountingGameState | null> {
  try {
    // Decompress
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);

    // CRITICAL: LZ-String returns null on invalid data
    if (decompressed === null) {
      console.error('Failed to decompress game state');
      return null;
    }

    // Parse JSON
    const parsed = JSON.parse(decompressed);

    // Validate with schema
    const result = CountingGameStateSchema.safeParse(parsed);
    if (!result.success) {
      console.error('Invalid game state schema', result.error);
      return null;
    }

    // Validate checksum
    const isValid = await validateChecksum(result.data);
    if (!isValid) {
      console.error('Checksum validation failed - data may be tampered');
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error decoding game state', error);
    return null;
  }
}

/**
 * Generate shareable URL with game state
 */
export async function generateGameUrl(
  state: CountingGameState,
  baseUrl: string
): Promise<string> {
  const encoded = await encodeFullGameState(state);
  const url = new URL(baseUrl);
  url.searchParams.set('state', encoded);
  return url.toString();
}

/**
 * Parse game state from URL
 * Returns null if no state parameter or invalid
 */
export async function parseGameUrl(
  url: string
): Promise<CountingGameState | null> {
  try {
    const urlObj = new URL(url);
    const stateParam = urlObj.searchParams.get('state');

    if (!stateParam) {
      return null; // No state parameter
    }

    return await decodeFullGameState(stateParam);
  } catch (error) {
    console.error('Error parsing game URL', error);
    return null;
  }
}
```

**Validation**:
```bash
npm test -- counting-url-encoder.test.ts
```

---

#### 1.6: counting-delta.ts (~250 lines)

**Location**: `/packages/core/src/lib/counting-delta.ts`

**Purpose**: Efficient delta encoding for subsequent moves

**Implementation**:
```typescript
import * as LZString from 'lz-string';
import {
  CountingGameState,
  CountingMove,
  CountingDelta,
  CountingDeltaSchema,
} from './counting-schema';
import { applyMove } from './counting-logic';
import { generateChecksum } from './counting-checksum';

/**
 * Generate deterministic secret for HMAC signatures
 * Both players can generate same secret from game/player IDs
 */
export function generateDeltaSecret(
  gameId: string,
  player1Id: string,
  player2Id: string
): string {
  // Simple concatenation - both players know all three IDs
  return `${gameId}:${player1Id}:${player2Id}`;
}

/**
 * Generate HMAC signature for delta
 * Uses Web Crypto API
 */
async function generateHmacSignature(
  data: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();

  // Import secret as CryptoKey
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  // Sign data
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(data)
  );

  // Convert to hex
  const signatureArray = Array.from(new Uint8Array(signature));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return signatureHex;
}

/**
 * Verify HMAC signature
 */
async function verifyHmacSignature(
  data: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const expectedSignature = await generateHmacSignature(data, secret);
  return signature === expectedSignature;
}

/**
 * Encode delta (move difference) for URL sharing
 *
 * CRITICAL: Includes HMAC signature to prevent tampering
 */
export async function encodeDelta(
  previousState: CountingGameState,
  newMove: CountingMove,
  secret: string
): Promise<string> {
  // Create delta object (without signature)
  const deltaWithoutSignature = {
    gameId: previousState.gameId,
    currentTurn: previousState.currentTurn + 1, // Next turn number
    move: newMove,
  };

  // Generate signature
  const dataToSign = JSON.stringify(deltaWithoutSignature);
  const signature = await generateHmacSignature(dataToSign, secret);

  // Add signature
  const delta: CountingDelta = {
    ...deltaWithoutSignature,
    signature,
  };

  // Serialize and compress
  const json = JSON.stringify(delta);
  const compressed = LZString.compressToEncodedURIComponent(json);

  return compressed;
}

/**
 * Decode delta from URL
 * Returns null if invalid
 */
export async function decodeDelta(
  encoded: string
): Promise<CountingDelta | null> {
  try {
    // Decompress
    const decompressed = LZString.decompressFromEncodedURIComponent(encoded);

    // CRITICAL: Check for null
    if (decompressed === null) {
      console.error('Failed to decompress delta');
      return null;
    }

    // Parse JSON
    const parsed = JSON.parse(decompressed);

    // Validate with schema
    const result = CountingDeltaSchema.safeParse(parsed);
    if (!result.success) {
      console.error('Invalid delta schema', result.error);
      return null;
    }

    return result.data;
  } catch (error) {
    console.error('Error decoding delta', error);
    return null;
  }
}

/**
 * Apply delta to base state
 * Returns new state with updated checksum
 * Returns null if validation fails
 */
export async function applyDelta(
  baseState: CountingGameState,
  delta: CountingDelta,
  secret: string
): Promise<CountingGameState | null> {
  try {
    // Validate game ID matches
    if (delta.gameId !== baseState.gameId) {
      console.error('Delta gameId mismatch');
      return null;
    }

    // Validate turn sequence
    const expectedTurn = baseState.currentTurn + 1;
    if (delta.currentTurn !== expectedTurn) {
      console.error(`Delta turn mismatch: expected ${expectedTurn}, got ${delta.currentTurn}`);
      return null;
    }

    // Verify HMAC signature
    const deltaWithoutSignature = {
      gameId: delta.gameId,
      currentTurn: delta.currentTurn,
      move: delta.move,
    };
    const dataToVerify = JSON.stringify(deltaWithoutSignature);
    const isValid = await verifyHmacSignature(dataToVerify, delta.signature, secret);

    if (!isValid) {
      console.error('Delta signature verification failed - data may be tampered');
      return null;
    }

    // Apply move
    const newStateWithoutChecksum = applyMove(baseState, delta.move);

    // Generate new checksum
    const checksum = await generateChecksum(newStateWithoutChecksum);

    return { ...newStateWithoutChecksum, checksum };
  } catch (error) {
    console.error('Error applying delta', error);
    return null;
  }
}

/**
 * Generate delta URL
 */
export async function generateDeltaUrl(
  previousState: CountingGameState,
  newMove: CountingMove,
  secret: string,
  baseUrl: string
): Promise<string> {
  const encoded = await encodeDelta(previousState, newMove, secret);
  const url = new URL(baseUrl);
  url.searchParams.set('delta', encoded);
  return url.toString();
}

/**
 * Parse delta from URL
 * Returns null if no delta parameter or invalid
 */
export async function parseDeltaUrl(
  url: string
): Promise<CountingDelta | null> {
  try {
    const urlObj = new URL(url);
    const deltaParam = urlObj.searchParams.get('delta');

    if (!deltaParam) {
      return null; // No delta parameter
    }

    return await decodeDelta(deltaParam);
  } catch (error) {
    console.error('Error parsing delta URL', error);
    return null;
  }
}
```

**Validation**:
```bash
npm test -- counting-delta.test.ts
```

---

### Phase 2: Core Tests (Parallel)

Each test file follows the same structure. I'll provide one complete example and summaries for the rest.

#### 2.1: counting-schema.test.ts

**Location**: `/packages/core/__tests__/counting-schema.test.ts`

**Implementation**:
```typescript
import { describe, it, expect } from 'vitest';
import {
  CountingGameStateSchema,
  CountingMoveSchema,
  CountingDeltaSchema,
} from '../src/lib/counting-schema';

describe('Counting Game Schemas', () => {
  describe('CountingGameStateSchema', () => {
    it('should validate valid game state', () => {
      const validState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        currentCount: 5,
        currentTurn: 3,
        currentPlayer: '1',
        player1: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'Alice',
        },
        player2: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          name: 'Bob',
        },
        status: 'playing',
        checksum: 'abc123',
      };

      const result = CountingGameStateSchema.safeParse(validState);
      expect(result.success).toBe(true);
    });

    it('should reject invalid gameId', () => {
      const invalidState = {
        gameId: 'not-a-uuid',
        currentCount: 5,
        currentTurn: 3,
        currentPlayer: '1',
        player1: { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Alice' },
        player2: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Bob' },
        status: 'playing',
        checksum: 'abc123',
      };

      const result = CountingGameStateSchema.safeParse(invalidState);
      expect(result.success).toBe(false);
    });

    it('should reject negative currentCount', () => {
      const invalidState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        currentCount: -1,
        currentTurn: 3,
        currentPlayer: '1',
        player1: { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Alice' },
        player2: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Bob' },
        status: 'playing',
        checksum: 'abc123',
      };

      const result = CountingGameStateSchema.safeParse(invalidState);
      expect(result.success).toBe(false);
    });

    it('should reject invalid currentPlayer', () => {
      const invalidState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        currentCount: 5,
        currentTurn: 3,
        currentPlayer: '3', // Invalid
        player1: { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Alice' },
        player2: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Bob' },
        status: 'playing',
        checksum: 'abc123',
      };

      const result = CountingGameStateSchema.safeParse(invalidState);
      expect(result.success).toBe(false);
    });

    it('should reject invalid status', () => {
      const invalidState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        currentCount: 5,
        currentTurn: 3,
        currentPlayer: '1',
        player1: { id: '123e4567-e89b-12d3-a456-426614174001', name: 'Alice' },
        player2: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Bob' },
        status: 'invalid', // Not in enum
        checksum: 'abc123',
      };

      const result = CountingGameStateSchema.safeParse(invalidState);
      expect(result.success).toBe(false);
    });

    it('should reject player name longer than 20 chars', () => {
      const invalidState = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        currentCount: 5,
        currentTurn: 3,
        currentPlayer: '1',
        player1: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          name: 'ThisNameIsWayTooLongForValidation',
        },
        player2: { id: '123e4567-e89b-12d3-a456-426614174002', name: 'Bob' },
        status: 'playing',
        checksum: 'abc123',
      };

      const result = CountingGameStateSchema.safeParse(invalidState);
      expect(result.success).toBe(false);
    });
  });

  describe('CountingMoveSchema', () => {
    it('should validate valid move', () => {
      const validMove = {
        number: 5,
        timestamp: '2025-10-13T12:00:00Z',
      };

      const result = CountingMoveSchema.safeParse(validMove);
      expect(result.success).toBe(true);
    });

    it('should reject non-positive number', () => {
      const invalidMove = {
        number: 0,
        timestamp: '2025-10-13T12:00:00Z',
      };

      const result = CountingMoveSchema.safeParse(invalidMove);
      expect(result.success).toBe(false);
    });

    it('should reject invalid timestamp', () => {
      const invalidMove = {
        number: 5,
        timestamp: 'not-a-timestamp',
      };

      const result = CountingMoveSchema.safeParse(invalidMove);
      expect(result.success).toBe(false);
    });
  });

  describe('CountingDeltaSchema', () => {
    it('should validate valid delta', () => {
      const validDelta = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        currentTurn: 5,
        move: {
          number: 10,
          timestamp: '2025-10-13T12:00:00Z',
        },
        signature: 'abc123signature',
      };

      const result = CountingDeltaSchema.safeParse(validDelta);
      expect(result.success).toBe(true);
    });

    it('should reject delta without signature', () => {
      const invalidDelta = {
        gameId: '123e4567-e89b-12d3-a456-426614174000',
        currentTurn: 5,
        move: {
          number: 10,
          timestamp: '2025-10-13T12:00:00Z',
        },
        // Missing signature
      };

      const result = CountingDeltaSchema.safeParse(invalidDelta);
      expect(result.success).toBe(false);
    });
  });
});
```

#### 2.2-2.6: Other Test Files (Summaries)

**counting-logic.test.ts** (~300 lines):
- Test `createInitialGameState` - validates initial state structure
- Test `validateMove` - all validation paths (valid, invalid, empty, leading zeros, wrong number)
- Test `applyMove` - increments count, switches player, increments turn
- Test `handleGiveUp` - sets winner, doesn't modify count/turn
- Test `getGameStatus` - returns correct status for all game states
- Test `isPlayerTurn` - correctly identifies current player
- Test `getOpponentPlayerNumber` - returns opposite player

**counting-storage.test.ts** (~200 lines):
- Mock localStorage with `vi.stubGlobal('localStorage', mockLocalStorage)`
- Test `saveGameState` - saves valid state, rejects invalid
- Test `loadGameState` - loads valid state, returns null for invalid/missing
- Test `clearGameState` - removes from localStorage
- Test name methods - get/set for my-name, player1-name, player2-name
- Test `getMyPlayerId` - generates UUID if not exists
- Test quota exceeded error handling

**counting-checksum.test.ts** (~150 lines):
- Mock `crypto.subtle` with `vi.stubGlobal('crypto', mockCrypto)`
- Test `generateChecksum` - produces hex string
- Test canonical JSON - same state produces same checksum
- Test canonical JSON - different object key order produces same checksum
- Test `validateChecksum` - accepts valid, rejects invalid
- Test checksum changes when state changes

**counting-url-encoder.test.ts** (~250 lines):
- Test `encodeFullGameState` - produces string
- Test `decodeFullGameState` - roundtrip encoding/decoding
- Test invalid encoded strings - returns null
- Test tampered data (bad checksum) - returns null
- Test `generateGameUrl` - produces valid URL with state parameter
- Test `parseGameUrl` - extracts state from URL, returns null if missing
- Test malformed URLs - handles gracefully

**counting-delta.test.ts** (~300 lines):
- Mock `crypto.subtle` for HMAC
- Test `generateDeltaSecret` - deterministic from IDs
- Test `encodeDelta` - produces string with signature
- Test `decodeDelta` - roundtrip encoding/decoding
- Test `applyDelta` - applies move correctly, validates signature
- Test tampered delta (bad signature) - rejects
- Test wrong gameId - rejects
- Test wrong turn number - rejects
- Test `generateDeltaUrl` - produces valid URL
- Test `parseDeltaUrl` - extracts delta from URL

**Validation (All Tests)**:
```bash
cd packages/core
npm test
# Expected: 201 tests passing (141 existing + 60 new)
```

---

### Phase 3: Game Application

#### 3.1: Project Setup

Create these files in `/games/counting-game/`:

**package.json**:
```json
{
  "name": "counting-game",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --port 5175",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "@correspondence-games/core": "workspace:*",
    "zod": "^3.24.1",
    "lz-string": "^1.5.0",
    "uuid": "^11.0.4"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "@types/react-dom": "^18.3.1",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.7.2",
    "vite": "^6.0.3",
    "vitest": "^2.1.8",
    "happy-dom": "^16.10.1",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2"
  }
}
```

**tsconfig.json**:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**vite.config.ts**:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
  },
});
```

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
  },
});
```

**index.html**:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Counting Game - Correspondence Games</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

**src/main.tsx**:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './App.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
```

**.gitignore**:
```
node_modules
dist
*.local
.DS_Store
```

**Validation**:
```bash
cd games/counting-game
npm install
npm run dev
# Should start on http://localhost:5175
```

---

#### 3.2: src/App.tsx (~800-1000 lines)

**CRITICAL**: This is the main implementation. I'll provide the complete structure with all state machine logic.

```typescript
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { CountingGameState, CountingMove } from '@correspondence-games/core/lib/counting-schema';
import { validateMove, applyMove, handleGiveUp, getGameStatus, createInitialGameState } from '@correspondence-games/core/lib/counting-logic';
import {
  saveGameState,
  loadGameState,
  clearGameState,
  getMyName,
  setMyName,
  getMyPlayerId,
  setMyPlayerId,
  getPlayer1Name,
  setPlayer1Name,
  getPlayer2Name,
  setPlayer2Name,
} from '@correspondence-games/core/lib/counting-storage';
import { generateChecksum } from '@correspondence-games/core/lib/counting-checksum';
import { generateGameUrl, parseGameUrl } from '@correspondence-games/core/lib/counting-url-encoder';
import { generateDeltaSecret, generateDeltaUrl, parseDeltaUrl, applyDelta } from '@correspondence-games/core/lib/counting-delta';
import './App.css';

type GameMode = 'hotseat' | 'url';

function App() {
  // Player identity state
  const [player1Name, setPlayer1NameState] = useState<string | null>(null);
  const [player2Name, setPlayer2NameState] = useState<string | null>(null);
  const [myPlayerNumber, setMyPlayerNumber] = useState<1 | 2 | null>(null);
  const [myPlayerId, setMyPlayerIdState] = useState<string>('');

  // Game state
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [gameState, setGameState] = useState<CountingGameState | null>(null);

  // Input state (for real-time validation)
  const [inputValue, setInputValue] = useState<string>('');
  const [inputValid, setInputValid] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string>('');

  // URL sharing state
  const [shareUrl, setShareUrl] = useState<string>('');

  // Load player ID on mount
  useEffect(() => {
    const playerId = getMyPlayerId();
    setMyPlayerIdState(playerId);
  }, []);

  // Load game state and check URL on mount
  useEffect(() => {
    const loadStateFromUrl = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');
      const deltaParam = urlParams.get('delta');

      if (stateParam) {
        // Full state in URL
        const state = await parseGameUrl(window.location.href);
        if (state) {
          setGameState(state);
          setGameMode('url');
          saveGameState(state);

          // Determine my player number
          const myId = getMyPlayerId();
          if (state.player1.id === myId) {
            setMyPlayerNumber(1);
          } else if (state.player2.id === myId) {
            setMyPlayerNumber(2);
          } else {
            // I'm joining as player 2
            setMyPlayerNumber(2);
          }
        }
      } else if (deltaParam) {
        // Delta in URL - need to apply to existing state
        const delta = await parseDeltaUrl(window.location.href);
        const existingState = loadGameState();

        if (delta && existingState) {
          const secret = generateDeltaSecret(
            existingState.gameId,
            existingState.player1.id,
            existingState.player2.id
          );
          const newState = await applyDelta(existingState, delta, secret);

          if (newState) {
            setGameState(newState);
            setGameMode('url');
            saveGameState(newState);

            // Determine my player number
            const myId = getMyPlayerId();
            if (newState.player1.id === myId) {
              setMyPlayerNumber(1);
            } else {
              setMyPlayerNumber(2);
            }
          }
        }
      } else {
        // No URL params - check localStorage
        const savedState = loadGameState();
        if (savedState) {
          setGameState(savedState);
          // Mode will be determined by saved state context
        }
      }
    };

    loadStateFromUrl();
  }, []);

  // Sync game state to localStorage
  useEffect(() => {
    if (gameState) {
      saveGameState(gameState);
    }
  }, [gameState]);

  // Handle input change (real-time validation)
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    if (!gameState) return;

    const validation = validateMove(value, gameState.currentCount);
    setInputValid(validation.valid);
    setInputError(validation.error || '');
  };

  // Confirm move
  const handleConfirmMove = async () => {
    if (!gameState || !inputValid) return;

    // Create move object
    const move: CountingMove = {
      number: parseInt(inputValue, 10),
      timestamp: new Date().toISOString(),
    };

    // Apply move
    const newStateWithoutChecksum = applyMove(gameState, move);

    // Generate checksum
    const checksum = await generateChecksum(newStateWithoutChecksum);
    const newState: CountingGameState = { ...newStateWithoutChecksum, checksum };

    // Generate URL if in URL mode
    if (gameMode === 'url') {
      // Use delta encoding for subsequent moves
      if (gameState.currentTurn > 0) {
        const secret = generateDeltaSecret(
          gameState.gameId,
          gameState.player1.id,
          gameState.player2.id
        );
        const url = await generateDeltaUrl(
          gameState,
          move,
          secret,
          window.location.origin
        );
        setShareUrl(url);
      } else {
        // First move - use full state
        const url = await generateGameUrl(newState, window.location.origin);
        setShareUrl(url);
      }
    }

    // Update state
    setGameState(newState);

    // Clear input
    setInputValue('');
    setInputValid(false);
    setInputError('');
  };

  // Handle give up
  const handleGiveUpClick = async () => {
    if (!gameState || !myPlayerNumber) return;

    const confirmed = window.confirm(
      'Are you sure you want to give up? Your opponent will win.'
    );

    if (!confirmed) return;

    // Handle give up
    const newStateWithoutChecksum = handleGiveUp(gameState, myPlayerNumber);

    // Generate checksum
    const checksum = await generateChecksum(newStateWithoutChecksum);
    const newState: CountingGameState = { ...newStateWithoutChecksum, checksum };

    // Generate URL if in URL mode (final result sharing)
    if (gameMode === 'url') {
      const url = await generateGameUrl(newState, window.location.origin);
      setShareUrl(url);
    }

    // Update state
    setGameState(newState);
  };

  // Handle start game (hot-seat mode)
  const handleStartGame = async () => {
    if (!player1Name || !player2Name || !gameMode) return;

    const gameId = uuidv4();
    const player1Id = myPlayerId;
    const player2Id = uuidv4(); // Generate ID for player 2

    const initialState = createInitialGameState(
      gameId,
      player1Id,
      player1Name,
      player2Id,
      player2Name
    );

    const checksum = await generateChecksum(initialState);
    const fullState: CountingGameState = { ...initialState, checksum };

    setGameState(fullState);
    setMyPlayerNumber(1); // Player 1 starts
  };

  // Handle start game (URL mode)
  const handleStartGameUrl = async () => {
    if (!player1Name || !gameMode) return;

    const gameId = uuidv4();
    const player1Id = myPlayerId;
    const player2Id = uuidv4(); // Placeholder - will be replaced when P2 joins

    const initialState = createInitialGameState(
      gameId,
      player1Id,
      player1Name,
      player2Id,
      'Player 2' // Placeholder name
    );

    const checksum = await generateChecksum(initialState);
    const fullState: CountingGameState = { ...initialState, checksum };

    setGameState(fullState);
    setMyPlayerNumber(1);
  };

  // Copy URL to clipboard
  const handleCopyUrl = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('URL copied to clipboard!');
  };

  // Reset game
  const handleMainMenu = () => {
    clearGameState();
    setPlayer1NameState(null);
    setPlayer2NameState(null);
    setGameMode(null);
    setGameState(null);
    setInputValue('');
    setInputValid(false);
    setInputError('');
    setShareUrl('');
    window.history.replaceState({}, '', '/');
  };

  // ===== STATE MACHINE RENDERING =====

  // STATE 1: Player 1 Name Collection
  if (!player1Name) {
    return (
      <div className="container">
        <h1>🔢 Counting Game</h1>
        <form onSubmit={(e) => {
          e.preventDefault();
          const formData = new FormData(e.currentTarget);
          const name = formData.get('player1Name') as string;
          if (name && name.trim()) {
            const trimmed = name.trim();
            setPlayer1Name(trimmed);
            setPlayer1NameState(trimmed);
          }
        }} className="cg-form">
          <label htmlFor="player1Name" className="cg-form-label">
            Enter your name:
          </label>
          <input
            type="text"
            id="player1Name"
            name="player1Name"
            className="cg-form-input"
            autoFocus
            required
            maxLength={20}
          />
          <button type="submit" className="cg-button cg-button-primary">
            Continue
          </button>
        </form>
      </div>
    );
  }

  // STATE 2: Mode Selection
  if (!gameMode) {
    return (
      <div className="container">
        <h1>🔢 Counting Game</h1>
        <h2>Hi {player1Name}! Choose mode:</h2>
        <div className="mode-selection">
          <button
            className="mode-card"
            onClick={() => setGameMode('hotseat')}
          >
            <h3>🔄 Hot-Seat Mode</h3>
            <p>Play with someone on this device</p>
          </button>
          <button
            className="mode-card"
            onClick={() => setGameMode('url')}
          >
            <h3>🔗 URL Mode</h3>
            <p>Share game via URL to play remotely</p>
          </button>
        </div>
      </div>
    );
  }

  // STATE 3: Pre-Game Setup
  if (!gameState) {
    // Hot-seat: collect player 2 name
    if (gameMode === 'hotseat' && !player2Name) {
      return (
        <div className="container">
          <h1>🔢 Counting Game - Hot-Seat Mode</h1>
          <h2>Player 2</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            const name = formData.get('player2Name') as string;
            if (name && name.trim()) {
              const trimmed = name.trim();
              setPlayer2Name(trimmed);
              setPlayer2NameState(trimmed);
            }
          }} className="cg-form">
            <label htmlFor="player2Name" className="cg-form-label">
              Enter your name:
            </label>
            <input
              type="text"
              id="player2Name"
              name="player2Name"
              className="cg-form-input"
              autoFocus
              required
              maxLength={20}
            />
            <button type="submit" className="cg-button cg-button-primary">
              Start Game
            </button>
          </form>
        </div>
      );
    }

    // Ready to start
    return (
      <div className="container">
        <h1>🔢 Counting Game</h1>
        <h2>{gameMode === 'hotseat' ? 'Hot-Seat' : 'URL'} Mode</h2>
        <p>You: {player1Name}</p>
        {gameMode === 'url' && (
          <p className="warning">
            ⚠️ Don't clear browser memory during game
          </p>
        )}
        <button
          className="cg-button cg-button-primary cg-button-lg"
          onClick={gameMode === 'hotseat' ? handleStartGame : handleStartGameUrl}
        >
          Start Game
        </button>
        <button
          className="cg-button cg-button-secondary"
          onClick={handleMainMenu}
        >
          Main Menu
        </button>
      </div>
    );
  }

  // STATE 4: Game Over
  if (gameState.status !== 'playing') {
    const status = getGameStatus(gameState);

    if (gameMode === 'url') {
      // Generate final URL for sharing result
      if (!shareUrl) {
        generateGameUrl(gameState, window.location.origin).then(setShareUrl);
      }

      return (
        <div className="container">
          <h1>🎉 Game Over</h1>
          <h2>{status.winnerName} Wins!</h2>
          <p className="final-count">Final count: {status.finalCount}</p>

          <div className="url-section">
            <label>Share result with opponent:</label>
            <input
              type="text"
              value={shareUrl}
              readOnly
              className="url-display"
            />
            <button
              className="cg-button cg-button-primary"
              onClick={handleCopyUrl}
            >
              Copy URL
            </button>
          </div>

          <button
            className="cg-button cg-button-secondary"
            onClick={handleMainMenu}
          >
            Main Menu
          </button>
        </div>
      );
    }

    // Hot-seat mode
    return (
      <div className="container">
        <h1>🎉 Game Over</h1>
        <h2>{status.winnerName} Wins!</h2>
        <p className="final-count">Final count: {status.finalCount}</p>

        <button
          className="cg-button cg-button-primary cg-button-lg"
          onClick={handleMainMenu}
        >
          Play Again
        </button>
      </div>
    );
  }

  // STATE 5: Their Turn (waiting for opponent)
  if (gameState.currentPlayer !== myPlayerNumber?.toString()) {
    if (gameMode === 'hotseat') {
      return (
        <div className="container">
          <h1>🔢 Counting Game</h1>
          <div className="game-info">
            <p>Current count: <strong>{gameState.currentCount}</strong></p>
            <p>It's {myPlayerNumber === 1 ? player2Name : player1Name}'s turn</p>
          </div>
          <button
            className="cg-button cg-button-primary cg-button-lg"
            onClick={() => {
              // Switch to other player's turn
              setMyPlayerNumber(myPlayerNumber === 1 ? 2 : 1);
            }}
          >
            I'm Ready
          </button>
        </div>
      );
    }

    // URL mode - passive waiting
    return (
      <div className="container">
        <h1>🔢 Counting Game</h1>
        <div className="game-info">
          <p>Current count: <strong>{gameState.currentCount}</strong></p>
          <p className="waiting">
            ⏳ Waiting for {myPlayerNumber === 1 ? gameState.player2.name : gameState.player1.name}...
          </p>
        </div>
      </div>
    );
  }

  // STATE 6: My Turn (active play)
  return (
    <div className="container">
      <h1>🔢 Counting Game</h1>
      <div className="game-info">
        <p>You: <strong>{myPlayerNumber === 1 ? player1Name : player2Name}</strong></p>
        <p>Current count: <strong>{gameState.currentCount}</strong></p>
        <p className="instruction">Enter the next number:</p>
      </div>

      <div className="input-section">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          className={`count-input ${inputValid ? 'valid' : inputError ? 'invalid' : ''}`}
          placeholder={`${gameState.currentCount + 1}`}
          autoFocus
        />
        {inputError && <p className="error-message">{inputError}</p>}
      </div>

      <div className="button-group">
        <button
          className="cg-button cg-button-primary cg-button-lg"
          disabled={!inputValid}
          onClick={handleConfirmMove}
        >
          {gameMode === 'hotseat' ? 'Confirm & Pass Device' : 'Confirm & Generate URL'}
        </button>

        <button
          className="cg-button cg-button-secondary"
          onClick={handleGiveUpClick}
        >
          Give Up
        </button>
      </div>

      {shareUrl && gameMode === 'url' && (
        <div className="url-section">
          <label>Share this URL:</label>
          <input
            type="text"
            value={shareUrl}
            readOnly
            className="url-display"
          />
          <button
            className="cg-button cg-button-primary"
            onClick={handleCopyUrl}
          >
            Copy URL
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
```

**Validation**:
```bash
npm run dev
# Manual testing in both modes
```

---

#### 3.3: src/App.css (~400-500 lines)

```css
@import '@correspondence-games/core/src/styles/correspondence-games.css';

/* Container */
.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  text-align: center;
}

/* Game Info */
.game-info {
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

@media (prefers-color-scheme: dark) {
  .game-info {
    background: #2a2a2a;
  }
}

.game-info p {
  margin: 10px 0;
  font-size: 18px;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .game-info p {
    color: #e0e0e0;
  }
}

.game-info strong {
  font-size: 24px;
  color: #007bff;
}

@media (prefers-color-scheme: dark) {
  .game-info strong {
    color: #0d6efd;
  }
}

.instruction {
  font-weight: 600;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .instruction {
    color: #999;
  }
}

.waiting {
  font-style: italic;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .waiting {
    color: #999;
  }
}

/* Input Section */
.input-section {
  margin: 30px 0;
}

.count-input {
  width: 200px;
  padding: 15px;
  font-size: 24px;
  text-align: center;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  color: #333;
  transition: all 0.2s;
}

@media (prefers-color-scheme: dark) {
  .count-input {
    background: #1e1e1e;
    border-color: #444;
    color: #e0e0e0;
  }
}

.count-input:focus {
  outline: none;
  border-color: #007bff;
}

@media (prefers-color-scheme: dark) {
  .count-input:focus {
    border-color: #0d6efd;
  }
}

/* Valid input */
.count-input.valid {
  border-color: #28a745;
  background: #f0fff4;
}

@media (prefers-color-scheme: dark) {
  .count-input.valid {
    border-color: #198754;
    background: #0d2818;
  }
}

/* Invalid input */
.count-input.invalid {
  border-color: #dc3545;
  background: #fff5f5;
}

@media (prefers-color-scheme: dark) {
  .count-input.invalid {
    border-color: #dc3545;
    background: #2c1010;
  }
}

/* Error message */
.error-message {
  margin-top: 10px;
  color: #dc3545;
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .error-message {
    color: #ff6b6b;
  }
}

/* Button Group */
.button-group {
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin: 30px 0;
}

/* Mode Selection */
.mode-selection {
  display: flex;
  gap: 20px;
  justify-content: center;
  margin: 30px 0;
}

.mode-card {
  flex: 1;
  max-width: 250px;
  padding: 30px 20px;
  background: #f8f9fa;
  border: 2px solid #ddd;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

@media (prefers-color-scheme: dark) {
  .mode-card {
    background: #2a2a2a;
    border-color: #444;
  }
}

.mode-card:hover {
  border-color: #007bff;
  background: #e7f3ff;
  transform: translateY(-2px);
}

@media (prefers-color-scheme: dark) {
  .mode-card:hover {
    border-color: #0d6efd;
    background: #1a2a3a;
  }
}

.mode-card h3 {
  margin: 0 0 10px 0;
  font-size: 20px;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .mode-card h3 {
    color: #e0e0e0;
  }
}

.mode-card p {
  margin: 0;
  font-size: 14px;
  color: #666;
}

@media (prefers-color-scheme: dark) {
  .mode-card p {
    color: #999;
  }
}

/* URL Section */
.url-section {
  margin: 30px 0;
  padding: 20px;
  background: #f8f9fa;
  border-radius: 8px;
}

@media (prefers-color-scheme: dark) {
  .url-section {
    background: #2a2a2a;
  }
}

.url-section label {
  display: block;
  margin-bottom: 10px;
  font-weight: 600;
  color: #333;
}

@media (prefers-color-scheme: dark) {
  .url-section label {
    color: #e0e0e0;
  }
}

.url-display {
  width: 100%;
  padding: 12px;
  font-size: 14px;
  font-family: 'Courier New', monospace;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  color: #333;
  margin-bottom: 10px;
}

@media (prefers-color-scheme: dark) {
  .url-display {
    background: #1e1e1e;
    border-color: #444;
    color: #e0e0e0;
  }
}

/* Warning */
.warning {
  padding: 15px;
  margin: 20px 0;
  background: #fff3cd;
  border: 1px solid #ffc107;
  border-radius: 4px;
  color: #856404;
  font-size: 14px;
}

@media (prefers-color-scheme: dark) {
  .warning {
    background: #3a3000;
    border-color: #b8860b;
    color: #ffd700;
  }
}

/* Final Count */
.final-count {
  font-size: 28px;
  font-weight: bold;
  margin: 20px 0;
  color: #007bff;
}

@media (prefers-color-scheme: dark) {
  .final-count {
    color: #0d6efd;
  }
}

/* Responsive */
@media (max-width: 600px) {
  .mode-selection {
    flex-direction: column;
  }

  .mode-card {
    max-width: 100%;
  }
}
```

**Validation**:
```bash
# Test in browser DevTools
# 1. Open DevTools → Rendering
# 2. Emulate prefers-color-scheme: dark
# 3. Verify all elements styled correctly
# 4. Toggle light/dark multiple times
```

---

#### 3.4: src/App.test.tsx (~400 lines)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from './App';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

vi.stubGlobal('localStorage', mockLocalStorage);

describe('Counting Game', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, '', '/');
  });

  describe('Name Collection', () => {
    it('should show player 1 name form on load', () => {
      render(<App />);
      expect(screen.getByLabelText(/enter your name/i)).toBeInTheDocument();
    });

    it('should save player 1 name and proceed to mode selection', async () => {
      render(<App />);

      const input = screen.getByLabelText(/enter your name/i);
      const button = screen.getByRole('button', { name: /continue/i });

      fireEvent.change(input, { target: { value: 'Alice' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/choose mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Mode Selection', () => {
    it('should show mode selection after name entered', async () => {
      render(<App />);

      const input = screen.getByLabelText(/enter your name/i);
      fireEvent.change(input, { target: { value: 'Alice' } });
      fireEvent.submit(input.closest('form')!);

      await waitFor(() => {
        expect(screen.getByText(/hot-seat mode/i)).toBeInTheDocument();
        expect(screen.getByText(/url mode/i)).toBeInTheDocument();
      });
    });
  });

  describe('Input Validation', () => {
    // NOTE: This test requires completing hot-seat flow
    // Full implementation in actual test file
    it('should enable confirm button when correct number entered', async () => {
      // TODO: Implement
    });

    it('should disable confirm button when wrong number entered', async () => {
      // TODO: Implement
    });

    it('should reject leading zeros', async () => {
      // TODO: Implement
    });
  });

  describe('Give Up', () => {
    it('should show give up button during turn', async () => {
      // TODO: Implement
    });

    it('should end game when player gives up', async () => {
      // TODO: Implement
    });
  });
});
```

**Validation**:
```bash
npm test
# Expected: ~25 tests passing
```

---

#### 3.5: Documentation

**STATE_DIAGRAMS.md** (~500 lines):

Use STATE_DIAGRAM_TEMPLATE structure with:
- Unified game flow diagram
- State details for each state
- UI differences table
- Testing checklist

**README.md** (~150 lines):

```markdown
# Counting Game

A simple turn-based counting game where players take turns incrementing a count. Who can concentrate longer?

## How to Play

1. Enter your name
2. Choose mode (Hot-Seat or URL)
3. Start counting from 1
4. Each player must type the next number correctly
5. Give up at any time to end the game
6. Winner is the last player standing!

## Rules

- Start at count 0
- First player types "1", second player types "2", etc.
- Numbers must be exact (no leading zeros)
- You can give up at any time
- Opponent wins if you give up

## Development

```bash
npm install
npm run dev    # Start dev server on :5175
npm test       # Run tests
npm run build  # Production build
```

## Testing

See `App.test.tsx` for unit tests.

Manual testing checklist in `STATE_DIAGRAMS.md`.

## Technologies

- React 18 + TypeScript
- Vite (build tool)
- Vitest (testing)
- Correspondence Games Framework

## License

MIT
```

---

### Phase 4: Validation Loop

This is the **CRITICAL** validation phase. Each command must be executable.

#### Level 1: Syntax & Type Checking

```bash
cd packages/core
npm run build
# Expected: No TypeScript errors, clean build

cd games/counting-game
npm run build
# Expected: No TypeScript errors, clean build
```

**Pass Criteria**: Zero TypeScript errors, zero warnings

---

#### Level 2: Core Unit Tests

```bash
cd packages/core
npm test
```

**Pass Criteria**: 201 tests passing (141 existing + 60 new)

**If tests fail**:
1. Read error messages carefully
2. Fix implementation bugs
3. Re-run tests
4. Repeat until all pass

---

#### Level 3: Game Tests

```bash
cd games/counting-game
npm test
```

**Pass Criteria**: All tests passing (~25 tests)

**If tests fail**:
1. Check error messages
2. Fix component logic
3. Re-run tests
4. Repeat until all pass

---

#### Level 4: Manual Integration Testing

**Hot-Seat Mode:**
```bash
cd games/counting-game
npm run dev
# Open http://localhost:5175 in browser
```

**Test Scenario**:
1. Enter player 1 name "Alice" → Continue
2. Select "Hot-Seat Mode"
3. Enter player 2 name "Bob" → Start Game
4. Alice types "1" → Confirm & Pass Device
5. Bob clicks "I'm Ready"
6. Bob types "2" → Confirm & Pass Device
7. Alice clicks "I'm Ready"
8. Alice types "3" → Confirm & Pass Device
9. Bob clicks "I'm Ready"
10. Bob clicks "Give Up"
11. Confirm give up dialog
12. Verify: "Alice Wins! Final count: 3"

**Pass Criteria**: All steps work without errors

---

**URL Mode:**
```bash
cd games/counting-game
npm run dev
# Open http://localhost:5175 in Chrome
# Open http://localhost:5175 in Firefox or Incognito
```

**Test Scenario**:
1. Chrome: Enter name "Alice" → Continue
2. Chrome: Select "URL Mode" → Start Game
3. Chrome: Type "1" → Confirm & Generate URL
4. Chrome: Copy URL
5. Firefox: Paste URL, press Enter
6. Firefox: Enter name "Bob" → Continue
7. Firefox: Type "2" → Confirm & Generate URL
8. Firefox: Copy URL
9. Chrome: Paste URL, press Enter
10. Chrome: Type "3" → Confirm & Generate URL
11. Chrome: Copy URL
12. Firefox: Paste URL, press Enter
13. Firefox: Click "Give Up"
14. Verify: "Alice Wins! Final count: 3"
15. Firefox: Copy final URL
16. Chrome: Paste final URL
17. Verify: Chrome shows "Alice Wins! Final count: 3"

**Pass Criteria**: All steps work, URL sharing works correctly

---

#### Level 5: Dark Mode Testing

```bash
# In browser DevTools
# 1. F12 → More Tools → Rendering
# 2. Emulate CSS media feature prefers-color-scheme: dark
# 3. Verify ALL elements have dark mode styles
# 4. Toggle light/dark several times
```

**Elements to Check**:
- [ ] Container background
- [ ] Text colors (all headings, paragraphs)
- [ ] Input field (empty, valid, invalid states)
- [ ] All buttons (primary, secondary, disabled)
- [ ] Error messages
- [ ] URL display section
- [ ] Mode selection cards
- [ ] Warning messages
- [ ] Game info box

**Pass Criteria**: All elements readable and styled in both modes

---

#### Level 6: Edge Case Testing

Test these scenarios:

1. **Leading Zeros**: Type "01" → Should show error "Must be whole number without leading zeros"
2. **Wrong Number**: Count is 5, type "7" → Should show error "Expected 6"
3. **Negative Number**: Type "-1" → Should show error "Must be positive"
4. **Non-number**: Type "abc" → Should show error "Not a valid number"
5. **Empty Input**: Type nothing → Confirm button disabled
6. **Refresh Mid-Game**: Start game, type "1", refresh page → Should restore state
7. **Invalid URL**: Load `http://localhost:5175/?state=invalid` → Should show error or reset
8. **Tampered URL**: Modify state parameter → Should reject (checksum fail)

**Pass Criteria**: All edge cases handled gracefully, no crashes

---

## Anti-Patterns (What NOT to Do)

### ❌ Don't Validate Only on Confirm

```typescript
// WRONG: User clicks confirm, then you validate
const handleConfirm = () => {
  const validation = validateMove(inputValue, currentCount);
  if (!validation.valid) {
    alert('Invalid number!');
    return;
  }
  // Too late - button should have been disabled
};
```

**Correct**: Validate on every keystroke, disable button

---

### ❌ Don't Use prompt() for Names

```typescript
// WRONG: Not styleable, no dark mode
const name = prompt('Enter your name:');
```

**Correct**: Use styled HTML form with cg-form classes

---

### ❌ Don't Increment Turn on Give Up

```typescript
// WRONG: Game state changes after give up
function handleGiveUp(state) {
  return {
    ...state,
    currentTurn: state.currentTurn + 1, // WRONG
    status: 'player1_wins',
  };
}
```

**Correct**: Only change status, leave count/turn unchanged

---

### ❌ Don't Skip Checksum Validation

```typescript
// WRONG: Accepting state without validation
const state = await decodeFullGameState(encoded);
setGameState(state); // What if checksum is invalid?
```

**Correct**: decodeFullGameState already validates - check for null return

---

### ❌ Don't Forget Dark Mode

```css
/* WRONG: Only light mode */
.element {
  background: #fff;
  color: #000;
}
```

**Correct**: Add dark mode media query for EVERY element

---

## Success Criteria Summary

✅ All TypeScript compiles without errors
✅ 201 core tests passing
✅ 25+ game tests passing
✅ Hot-seat mode works end-to-end
✅ URL mode works end-to-end
✅ Input validation prevents invalid moves
✅ Give up mechanism works correctly
✅ Game over flows through handoff
✅ Dark mode works for all elements
✅ All edge cases handled gracefully
✅ No console errors or warnings

---

## Estimated Implementation Time

**Phase 1 (Core)**: 4-6 hours
**Phase 2 (Tests)**: 3-4 hours
**Phase 3 (Game App)**: 6-8 hours
**Phase 4 (Validation)**: 2-3 hours

**Total**: 15-21 hours for complete implementation

---

## Confidence Score: 9/10

**Why 9/10**:
- ✅ Comprehensive context provided (docs, patterns, examples)
- ✅ Clear implementation blueprint with pseudocode
- ✅ Executable validation gates at each level
- ✅ Anti-patterns documented with corrections
- ✅ Known gotchas identified with solutions
- ✅ Complete file structure with line counts
- ✅ Test patterns provided with examples
- ✅ Dark mode requirements explicit

**-1 Point**:
- Real-time input validation is a new UX pattern not in existing games
- Give up → game over → handoff flow is unique to this game

**Mitigation**: Detailed implementation guidance provided above addresses both concerns with complete code examples.

---

**END OF PRP**

This PRP contains ALL necessary context for one-pass implementation. An AI agent with this PRP should be able to implement the complete Counting Game without additional context or clarification.
