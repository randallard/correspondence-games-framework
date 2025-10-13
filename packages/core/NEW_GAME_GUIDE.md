# Creating a New Correspondence Game

This guide documents the complete process for creating a new game in the Correspondence Games Framework, including all the patterns, requirements, and best practices we've learned.

## Table of Contents

1. [Overview](#overview)
2. [Project Setup](#project-setup)
3. [Core Requirements](#core-requirements)
4. [Architecture Patterns](#architecture-patterns)
5. [UI/UX Requirements](#uiux-requirements)
6. [Testing Requirements](#testing-requirements)
7. [Documentation Requirements](#documentation-requirements)
8. [Deployment Checklist](#deployment-checklist)

---

## Overview

A correspondence game in this framework is a **URL-based, turn-by-turn game** that:
- Encodes game state in URLs (using full state or delta encoding)
- Works across devices and browsers
- Requires no server or backend
- Supports both local hot-seat mode and remote URL mode
- Includes proper dark mode support
- Has comprehensive state diagrams and tests

---

## Project Setup

### Step 1: Create Game Directory

```bash
cd games/
mkdir my-game
cd my-game
npm create vite@latest . -- --template react-ts
```

### Step 2: Install Dependencies

```bash
npm install
npm install @correspondence-games/core
```

### Step 3: Configure Package.json

```json
{
  "name": "my-game",
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

### Step 4: Setup Testing

```bash
npm install -D vitest @testing-library/react @testing-library/user-event happy-dom @vitest/ui
```

Create `vitest.config.ts`:

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

---

## Core Requirements

### 1. Game Schema (Zod)

Create your game state schema in `/packages/core/src/lib/my-game-schema.ts`:

```typescript
import { z } from 'zod';

export const MyGameStateSchema = z.object({
  gameId: z.string().uuid(),

  // Game-specific data
  board: z.array(z.string()),  // Example
  currentTurn: z.number().int().min(0),
  currentPlayer: z.union([z.literal(1), z.literal(2)]),

  // Player info
  player1: z.object({
    id: z.string().uuid(),
    name: z.string().min(1),
  }),
  player2: z.object({
    id: z.string().uuid(),
    name: z.string(), // Can be empty initially
  }),

  // Game status
  status: z.enum(['playing', 'player1_wins', 'player2_wins', 'draw']),

  // Security
  checksum: z.string(),
});

export type MyGameState = z.infer<typeof MyGameStateSchema>;
```

**Key Requirements:**
- Must include `gameId` (UUID)
- Must include `currentTurn` (increments each move)
- Must include `currentPlayer` (1 or 2)
- Must include player objects with `id` and `name`
- Must include `status` for game state
- Must include `checksum` for data integrity
- Use Zod for runtime validation

### 2. Game Logic

Create `/packages/core/src/lib/my-game-logic.ts`:

```typescript
import type { MyGameState } from './my-game-schema';

export function createInitialGameState(
  gameId: string,
  player1Id: string,
  player1Name: string
): Omit<MyGameState, 'checksum'> {
  return {
    gameId,
    board: Array(9).fill(''),  // Example for tic-tac-toe-like game
    currentTurn: 0,
    currentPlayer: 1,
    player1: { id: player1Id, name: player1Name },
    player2: { id: '', name: '' },
    status: 'playing',
  };
}

export function makeMove(
  gameState: MyGameState,
  playerId: string,
  moveData: any  // Game-specific move data
): Omit<MyGameState, 'checksum'> {
  // Validate it's this player's turn
  const currentPlayerNumber = gameState.currentPlayer;
  const currentPlayerId = currentPlayerNumber === 1
    ? gameState.player1.id
    : gameState.player2.id;

  if (playerId !== currentPlayerId) {
    throw new Error('Not your turn');
  }

  // Apply move (game-specific logic)
  const newBoard = [...gameState.board];
  // ... modify newBoard based on moveData

  // Check win condition
  const winner = checkWinner(newBoard);  // Game-specific
  const status = winner
    ? (winner === 1 ? 'player1_wins' : 'player2_wins')
    : (isDraw(newBoard) ? 'draw' : 'playing');

  // Return new state
  return {
    ...gameState,
    board: newBoard,
    currentTurn: gameState.currentTurn + 1,
    currentPlayer: (currentPlayerNumber === 1 ? 2 : 1) as 1 | 2,
    status,
  };
}

export function checkWinner(board: string[]): 1 | 2 | null {
  // Game-specific win condition checking
  return null;
}

export function isDraw(board: string[]): boolean {
  // Game-specific draw condition
  return false;
}
```

### 3. Storage Module

Create `/packages/core/src/lib/my-game-storage.ts`:

```typescript
import type { MyGameState } from './my-game-schema';
import { MyGameStateSchema } from './my-game-schema';

const STORAGE_KEY = 'my-game:game-state';

export class MyGameStorage {
  static saveGameState(gameState: MyGameState): void {
    try {
      const json = JSON.stringify(gameState);
      localStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
      console.error('Failed to save game state:', error);
    }
  }

  static loadGameState(): MyGameState | null {
    try {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return null;

      const data = JSON.parse(json);
      const validatedData = MyGameStateSchema.parse(data);
      return validatedData;
    } catch (error) {
      console.error('Failed to load game state:', error);
      return null;
    }
  }

  static clearGameState(): void {
    localStorage.removeItem(STORAGE_KEY);
  }
}
```

### 4. URL Encoding

Create `/packages/core/src/lib/my-game-url-encoder.ts`:

```typescript
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import type { MyGameState } from './my-game-schema';
import { MyGameStateSchema } from './my-game-schema';

export function encodeFullState(gameState: Omit<MyGameState, 'checksum'>, targetPlayerId: string): string {
  const data = {
    v: 1,  // Version
    s: gameState,  // State
    t: targetPlayerId,  // Target player ID
  };

  const json = JSON.stringify(data);
  const compressed = compressToEncodedURIComponent(json);
  return `#s=${compressed}`;
}

export function decodeFullState(hash: string): {
  gameState: Omit<MyGameState, 'checksum'>;
  targetPlayerId: string;
} {
  if (!hash.startsWith('#s=')) {
    throw new Error('Invalid hash format');
  }

  const compressed = hash.slice(3);
  const json = decompressFromEncodedURIComponent(compressed);

  if (!json) {
    throw new Error('Failed to decompress');
  }

  const data = JSON.parse(json);

  // Validate structure
  if (data.v !== 1) {
    throw new Error('Unsupported version');
  }

  // Validate game state (without checksum)
  const gameState = data.s;
  const targetPlayerId = data.t;

  return { gameState, targetPlayerId };
}

// Delta encoding for subsequent moves (optional but recommended)
export function encodeDelta(
  previousState: MyGameState,
  newState: Omit<MyGameState, 'checksum'>,
  targetPlayerId: string
): string {
  // Create delta with only changed data
  const delta = {
    v: 1,
    t: targetPlayerId,
    turn: newState.currentTurn,
    move: extractMove(previousState, newState),  // Game-specific
    // Include HMAC signature for security
  };

  const json = JSON.stringify(delta);
  const compressed = compressToEncodedURIComponent(json);
  return `#d=${compressed}`;
}
```

### 5. Checksum Calculation

Reuse the existing checksum module or create game-specific if needed:

```typescript
import { calculateChecksum } from '@correspondence-games/core/src/lib/checksum';

// For most games, the generic checksum works:
const checksum = await calculateChecksum(JSON.stringify(gameState));
```

---

## Architecture Patterns

### Game Modes

Every game should support **two modes**:

#### 1. Hot-Seat Mode

- Both players on same device
- Alternating turns with handoff screen
- Uses `localStorage` keys:
  - `correspondence-games:player1-name`
  - `correspondence-games:player2-name`
  - `correspondence-games:my-player-id`
  - `my-game:game-state`

#### 2. URL Mode

- Players on different devices
- Share game state via URLs
- Uses `localStorage` keys:
  - `correspondence-games:my-name` (single name)
  - `correspondence-games:my-player-id` (persistent UUID)
  - `my-game:game-state`

### State Machine

Document all states in `STATE_DIAGRAMS.md`. See `games/tic-tac-toe/STATE_DIAGRAMS.md` for reference.

**Required States:**

**Main Menu:**
- Choose between hot-seat and URL mode

**Hot-Seat Flow:**
1. Player 1 name input
2. Player 2 name input
3. Pre-game (show both names, start button)
4. Playing (active turn)
5. Handoff screen (pass device)
6. Game over

**URL Flow:**
1. Player 1 name input (with localStorage warning)
2. Pre-game (show player 1 only)
3. Playing (your turn / waiting)
4. Share URL section
5. Game over

**Error States:**
- localStorage cleared mid-game
- Invalid URL
- Checksum mismatch

### Player ID System

**Critical for URL mode:**

```typescript
// Persistent player ID (generated once per browser)
const myPlayerId = getOrCreatePlayerId();  // From player-storage

// When creating game
const gameState = createInitialGameState(gameId, myPlayerId, myName);

// When loading URL
const { gameState, targetPlayerId } = decodeFullState(hash);

// Determine your role
const myPlayerNumber = gameState.player1.id === myPlayerId ? 1 : 2;

// This allows:
// - Ryan starts Game A as Player 1
// - Ted starts Game B as Player 1
// - Ryan loads Game B → becomes Player 2 automatically
```

### localStorage Detection

**Critical pattern** for detecting localStorage cleared vs first join:

```typescript
// WRONG: Using currentTurn
if (gameState.currentTurn > 0) {
  // This triggers error for Player 2's first join!
}

// CORRECT: Check if player's name exists in game state
const playerNameInGameState = myPlayerNumber === 1
  ? gameState.player1.name
  : gameState.player2.name;

if (playerNameInGameState && playerNameInGameState.trim() !== '') {
  // Player has joined before but localStorage has no name - ERROR
} else {
  // Player joining for first time - show name prompt
}
```

---

## UI/UX Requirements

### 1. Dark Mode Support

**MANDATORY** - Every game must support dark mode.

See `DARK_MODE_GUIDE.md` for complete guide.

### 1.5. Name Collection Forms

**MANDATORY** - Use styled HTML forms, NOT JavaScript `prompt()` dialogs.

See `NAME_COLLECTION_PATTERN.md` for complete pattern and examples.

**Minimum requirements:**
```css
@import '@correspondence-games/core/src/styles/correspondence-games.css';

:root {
  color-scheme: light dark;
}

/* Add @media (prefers-color-scheme: dark) blocks for ALL elements */
```

### 2. Responsive Design

- Mobile-first approach
- Test on desktop, tablet, and mobile
- Touch-friendly buttons (min 44x44px)
- Readable text (min 16px base font)

### 3. Accessibility

- Keyboard navigation support
- Focus indicators
- ARIA labels where appropriate
- Sufficient color contrast (WCAG AA minimum)
- Screen reader friendly

### 4. Loading States

- Show loading indicator when processing
- Disable buttons during async operations
- Provide feedback for user actions

### 5. Error Handling

- Clear error messages
- Recovery options
- Don't crash on invalid input

---

## Testing Requirements

### 1. Unit Tests

Test all core functions:

```typescript
// __tests__/my-game-logic.test.ts
describe('createInitialGameState', () => {
  it('should create valid initial state', () => {
    const state = createInitialGameState(gameId, player1Id, 'Alice');
    expect(state.currentTurn).toBe(0);
    expect(state.currentPlayer).toBe(1);
    expect(state.player1.name).toBe('Alice');
  });
});

describe('makeMove', () => {
  it('should update game state correctly', () => {
    // Test move logic
  });

  it('should detect wins', () => {
    // Test win conditions
  });

  it('should detect draws', () => {
    // Test draw conditions
  });
});
```

### 2. Schema Tests

```typescript
// __tests__/my-game-schema.test.ts
describe('MyGameStateSchema', () => {
  it('should validate correct game state', () => {
    const state = { /* valid state */ };
    expect(() => MyGameStateSchema.parse(state)).not.toThrow();
  });

  it('should reject invalid game state', () => {
    const state = { /* invalid state */ };
    expect(() => MyGameStateSchema.parse(state)).toThrow();
  });
});
```

### 3. URL Encoding Tests

```typescript
// __tests__/my-game-url-encoder.test.ts
describe('encodeFullState / decodeFullState', () => {
  it('should encode and decode correctly', () => {
    const state = { /* game state */ };
    const hash = encodeFullState(state, playerId);
    const decoded = decodeFullState(hash);
    expect(decoded.gameState).toEqual(state);
  });
});
```

### 4. Storage Tests

```typescript
// __tests__/my-game-storage.test.ts
describe('MyGameStorage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should save and load game state', () => {
    const state = { /* game state */ };
    MyGameStorage.saveGameState(state);
    const loaded = MyGameStorage.loadGameState();
    expect(loaded).toEqual(state);
  });
});
```

### 5. Integration Tests (App Component)

Test all state flows:

```typescript
// src/App.test.tsx
describe('App Component - Display Tests', () => {
  describe('1. Main Menu', () => {
    it('should display mode selection', () => {
      // Test
    });
  });

  describe('2. Hot-Seat Mode Flow', () => {
    it('should show Player 1 name input', () => {});
    it('should show Player 2 name input', () => {});
    it('should show pre-game screen', () => {});
    it('should show playing state', () => {});
    it('should show handoff screen', () => {});
    it('should show game over', () => {});
  });

  describe('3. URL Mode Flow', () => {
    it('should show Player 1 name input with warning', () => {});
    it('should show pre-game screen', () => {});
    it('should show playing state with share URL', () => {});
    it('should handle Player 2 joining', () => {});
    it('should handle delta updates', () => {});
  });
});
```

**Minimum test coverage: 80%**

---

## Documentation Requirements

### 1. STATE_DIAGRAMS.md

Create comprehensive state diagram documentation with **separate diagrams for each mode**.

**REQUIRED:** Follow the `STATE_DIAGRAM_TEMPLATE.md` pattern:
- Separate Hot-Seat Mode diagram
- Separate URL Mode diagram
- Detailed state documentation for each mode
- Testing checklist

```markdown
# My Game State Diagrams

## Mode Selection
[Simple entry point diagram]

## Hot-Seat Mode Flow
[Complete hot-seat diagram]

### Hot-Seat Mode States
[All state details]

## URL Mode Flow
[Complete URL mode diagram]

### URL Mode States
[All state details]

## Testing Checklist
[Mode-specific tests]
```

See `STATE_DIAGRAM_TEMPLATE.md` for complete template and examples.

### 2. README.md

Create game-specific README:

```markdown
# My Game

## Description
Brief description of the game.

## How to Play
Game rules and objectives.

## Development
\`\`\`bash
npm install
npm run dev
npm test
\`\`\`

## Architecture
Link to STATE_DIAGRAMS.md
```

### 3. APP_TEST_PLAN.md (Optional)

Document test specifications for manual QA.

---

## Deployment Checklist

Before releasing a new game:

- [ ] All tests passing (unit + integration)
- [ ] Dark mode fully implemented and tested
- [ ] State diagrams documented
- [ ] Hot-seat mode works correctly
- [ ] URL mode works correctly
- [ ] Player ID role switching tested
- [ ] localStorage cleared detection works
- [ ] First join vs returning player works
- [ ] Full state and delta encoding work
- [ ] Checksum validation works
- [ ] Mobile responsive
- [ ] Keyboard accessible
- [ ] README complete
- [ ] TypeScript builds without errors
- [ ] Linting passes
- [ ] No console errors in production build

---

## Common Pitfalls

### ❌ Using currentTurn to detect localStorage cleared

**Wrong:**
```typescript
if (gameState.currentTurn > 0) {
  // Show error
}
```

**Correct:**
```typescript
const playerNameInGameState = myPlayerNumber === 1
  ? gameState.player1.name
  : gameState.player2.name;

if (playerNameInGameState && playerNameInGameState.trim() !== '') {
  // ERROR: localStorage cleared
} else {
  // First time joining
}
```

### ❌ Confusing React state with game state

- `player1Name` (React state) = UI display, may be null
- `gameState.player1.name` (game state) = persisted in game

Use React state for forms, game state for game logic.

### ❌ Wrong localStorage keys in URL mode

- Use: `hotSeatStorage.getMyName()` and `setMyName()`
- NOT: `getPlayer1Name()` (that's for hot-seat only)

### ❌ Missing dark mode for key elements

Test EVERY visual element in both light and dark mode.

### ❌ No checksum validation

Always validate checksums when loading state from URLs.

---

## Example Games

Reference these for patterns:

1. **Tic-Tac-Toe** (`games/tic-tac-toe/`)
   - Complete implementation
   - Full state diagrams
   - Comprehensive tests
   - Dark mode support

2. **Emoji Chain** (`games/emoji-chain/`)
   - Simpler game mechanics
   - Delta encoding example
   - Dark mode reference

---

## Framework Evolution

When you identify new patterns or improvements:

1. Update this guide
2. Update `DARK_MODE_GUIDE.md` if relevant
3. Update shared CSS framework
4. Update existing games to match
5. Document in git commit message

---

**Last Updated:** October 2025

**Version:** 1.0.0
