---
name: "Correspondence Games Framework - Phase 1: Core Foundation"
description: "Build a reusable React library for URL-based correspondence games using TDD/BDD principles"
version: "1.0"
---

## Project Vision

Create a **reusable React library/package** for building URL-based correspondence games with:
- Clean, tested, reliable core functionality
- Complete working examples (Rock-Paper-Scissors, Tic-Tac-Toe)
- Template/scaffolding for rapid game development
- Monorepo structure supporting demonstrations and npm publishing

**Distribution Strategy**: Monorepo with:
1. `packages/core` - Published npm package with core library
2. `packages/react` - React-specific components and hooks
3. `games/` - Complete reference implementations
4. `template/` - Clean starter template for demos and `npx create-correspondence-game`

## Development Philosophy

### BDD (Behavior-Driven Development)
- Start with user-facing behaviors and scenarios
- Build just enough code to make behaviors work
- No speculative features - only what's needed
- Tests describe behaviors, not implementation details

### TDD Red-Green-Refactor Cycle
1. **Red**: Write a failing test for the next small behavior
2. **Green**: Write minimal code to make the test pass
3. **Refactor**: Clean up code while keeping tests green
4. **Repeat**: Move to next behavior

### YAGNI (You Aren't Gonna Need It)
- Implement features only when needed
- Start with bare minimum
- Add parameters, values, and features as we discover the need
- Let the library emerge from building actual games

## Essential Context References

### Framework Architecture
- **File**: `/home/ryankhetlyr/Development/correspondence-games-framework/framework-considerations.md`
- **Why**: URL-based game patterns, compression, state encoding, best practices
- **Critical Sections**:
  - URL Structure (hash fragments)
  - State encoding (lz-string compression)
  - Stateless architecture patterns
  - URL length limits and validation

### Security Requirements
- **File**: `/home/ryankhetlyr/Development/correspondence-games-framework/security-considerations.md`
- **Why**: XSS prevention, HMAC authentication, state validation, DoS protection
- **Critical Sections**:
  - XSS Prevention (never use innerHTML with URL data)
  - HMAC authentication for tamper detection
  - State validation and move verification
  - Constant-time comparison for timing attack prevention

### React Best Practices
- **File**: `/home/ryankhetlyr/Development/correspondence-games-framework/claude_md_files/CLAUDE-REACT.md`
- **Why**: React 19 patterns, TypeScript strict mode, Zod validation, testing standards
- **Critical Sections**:
  - TypeScript strict requirements (no `any`, explicit return types)
  - Zod validation for all external data (MANDATORY)
  - Testing standards (80% coverage minimum, co-located tests)
  - Component guidelines (JSDoc documentation, max 200 lines)
  - BDD/TDD workflow patterns

### Existing Game Implementations (Reference Only)
- **Path**: `/home/ryankhetlyr/Development/correspondence-games/games/rock-paper-scissors/`
- **Why**: Extract common patterns and identify reusable code
- **Note**: These are exploration implementations - we'll build clean versions

- **Path**: `/home/ryankhetlyr/Development/correspondence-games/games/tic-tac-toe/`
- **Why**: Compare patterns between games to identify core abstractions
- **Note**: Look for duplicated code that should be in the framework

## Phase 1: Foundation with First Behavior

### Starting Behavior (Scenario 1: Player Name Management)

```gherkin
Feature: Player Name Management
  As a new player
  I want to provide my name once
  So that it's remembered for future games

Scenario: New player starts a game
  Given I am a new player (no name in localStorage)
  When I visit the game
  Then I should be prompted for my name
  And my name should be stored in browser memory

Scenario: Returning player
  Given I have played before (name in localStorage)
  When I visit the game
  Then I should see my name automatically
  And I should NOT be prompted again

Scenario: Player wants to change name
  Given my name is stored as "Alice"
  When I click "Change Name"
  Then I should be prompted for a new name
  And the new name should replace the old one
```

## Implementation Approach

### Step 1: Project Setup (Scaffolding)
```bash
correspondence-games-framework/
├── packages/
│   └── core/              # Core library (to be published)
│       ├── src/
│       │   └── lib/       # Library code emerges here
│       ├── __tests__/     # Vitest tests (TDD)
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── games/
│   └── .gitkeep           # Games will be added as we build them
├── template/
│   └── game-starter/      # Clean template for demos
└── package.json           # Workspace root
```

### Step 2: First Test (Red Phase)
**File**: `packages/core/__tests__/player-storage.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PlayerStorage } from '../src/lib/player-storage';

describe('PlayerStorage', () => {
  let storage: PlayerStorage;

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    storage = new PlayerStorage();
  });

  it('should return null when no player name is stored', () => {
    const name = storage.getPlayerName();
    expect(name).toBeNull();
  });

  it('should store and retrieve player name', () => {
    storage.setPlayerName('Alice');
    const name = storage.getPlayerName();
    expect(name).toBe('Alice');
  });

  it('should update existing player name', () => {
    storage.setPlayerName('Alice');
    storage.setPlayerName('Bob');
    const name = storage.getPlayerName();
    expect(name).toBe('Bob');
  });

  it('should persist player name across instances', () => {
    storage.setPlayerName('Alice');

    // Create new instance (simulates page reload)
    const newStorage = new PlayerStorage();
    const name = newStorage.getPlayerName();

    expect(name).toBe('Alice');
  });

  it('should validate player name is not empty', () => {
    expect(() => storage.setPlayerName('')).toThrow('Player name cannot be empty');
  });

  it('should sanitize player name to prevent XSS', () => {
    storage.setPlayerName('<script>alert("xss")</script>');
    const name = storage.getPlayerName();
    expect(name).not.toContain('<script>');
    expect(name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });
});
```

### Step 3: Make Tests Pass (Green Phase)
**File**: `packages/core/src/lib/player-storage.ts`

Write ONLY enough code to make tests pass. No extra features.

```typescript
/**
 * @fileoverview Player storage for managing player names in localStorage
 * @module correspondence-games-core/player-storage
 */

const STORAGE_KEY = 'correspondence-games:player-name';

/**
 * Manages player name storage in localStorage with XSS protection.
 *
 * @example
 * ```typescript
 * const storage = new PlayerStorage();
 * storage.setPlayerName('Alice');
 * const name = storage.getPlayerName(); // 'Alice'
 * ```
 */
export class PlayerStorage {
  /**
   * Retrieves the stored player name.
   *
   * @returns The stored player name, or null if not set
   */
  getPlayerName(): string | null {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored;
  }

  /**
   * Stores the player name with validation and sanitization.
   *
   * @param name - The player name to store
   * @throws {Error} If name is empty
   */
  setPlayerName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player name cannot be empty');
    }

    const sanitized = this.sanitizePlayerName(name);
    localStorage.setItem(STORAGE_KEY, sanitized);
  }

  /**
   * Sanitizes player name to prevent XSS attacks.
   *
   * @param name - The raw player name
   * @returns Sanitized player name safe for display
   * @private
   */
  private sanitizePlayerName(name: string): string {
    return name
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
```

### Step 4: Refactor
- Review code for clarity
- Check for duplication
- Ensure tests still pass
- Add JSDoc comments

### Step 5: Next Behavior
Once Step 3 passes, identify the next behavior to implement:
- URL state encoding/decoding?
- Game state schema with Zod?
- React hook for player name?

**Let the need drive the next test.**

## Technology Stack

### Core Dependencies
```json
{
  "dependencies": {
    "zod": "^3.22.4",           // Schema validation
    "lz-string": "^1.5.0"       // URL compression
  },
  "devDependencies": {
    "typescript": "^5.3.3",
    "vite": "^5.0.0",
    "vitest": "^1.0.0",
    "@testing-library/react": "^14.1.0",
    "@testing-library/user-event": "^14.5.0",
    "happy-dom": "^12.10.3"     // Vitest DOM environment
  }
}
```

### TypeScript Configuration (Strict Mode)
```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "allowJs": false
  }
}
```

## Progressive Implementation Plan

### Iteration 1: Player Storage (Current)
- ✅ Write tests for PlayerStorage
- ✅ Implement PlayerStorage
- ✅ Validate and sanitize player names

### Iteration 2: URL State Management
**Next Behavior**: Encode/decode game state in URL hash
```gherkin
Scenario: Encode game state to URL
  Given I have a game state object
  When I encode it to a URL hash fragment
  Then I should get a compressed, valid URL string
  And it should be under 2000 characters

Scenario: Decode game state from URL
  Given I have a valid URL hash fragment
  When I decode it
  Then I should get the original game state
  And all fields should match
```

### Iteration 3: Type-Safe State with Zod
**Next Behavior**: Validate external data with Zod schemas
```gherkin
Scenario: Validate game state from URL
  Given I receive a URL with encoded state
  When I decode and validate it
  Then invalid states should be rejected
  And valid states should pass validation
```

### Iteration 4: React Integration
**Next Behavior**: Create React hook for player management
```gherkin
Scenario: usePlayer hook manages player name
  Given I use the usePlayer hook in a component
  When the component renders
  Then I should get the player name (or null)
  And I should get a function to set the name
```

### Iteration 5: First Complete Game
**Next Behavior**: Build Rock-Paper-Scissors using the framework
- Identify gaps in the library
- Extract common patterns
- Refine abstractions

### Iteration 6: Second Game & Library Extraction
**Next Behavior**: Build Tic-Tac-Toe
- Notice duplicate patterns
- Extract to `packages/core`
- Both games consume the library

## Validation Loop

### Level 1: Unit Tests (TDD)
```bash
# Run tests in watch mode during development
cd packages/core
npm run test:watch

# Coverage check (minimum 80%)
npm run test:coverage
```

### Level 2: Type Checking
```bash
# Type check the entire workspace
npm run type-check

# Expected: Zero errors
```

### Level 3: Linting
```bash
# Lint with zero warnings allowed
npm run lint

# Auto-fix issues
npm run lint:fix
```

### Level 4: Integration Testing
```bash
# Start example game
cd games/rock-paper-scissors
npm run dev

# Manual testing checklist:
# - Player name prompt appears
# - Name is stored in localStorage
# - Name persists on page reload
# - XSS attempts are sanitized
```

## Success Criteria

### Phase 1 Complete When:
- [ ] PlayerStorage fully tested (80%+ coverage)
- [ ] URL encoding/decoding implemented with tests
- [ ] Zod schemas for game state validation
- [ ] Basic React hooks for player management
- [ ] First game (RPS) uses the framework
- [ ] All tests passing
- [ ] No TypeScript errors
- [ ] No linting warnings
- [ ] Documentation complete (JSDoc for all exports)

### Quality Gates (MUST PASS)
- [ ] TypeScript strict mode: Zero errors
- [ ] Test coverage: Minimum 80%
- [ ] ESLint: Zero warnings with `--max-warnings 0`
- [ ] All functions have JSDoc documentation
- [ ] All external data validated with Zod
- [ ] XSS protection on all user inputs
- [ ] No `any` types (except library declarations)

## Anti-Patterns to Avoid

- ❌ Don't write implementation before tests (TDD violation)
- ❌ Don't add features "because we might need them" (YAGNI violation)
- ❌ Don't skip validation on external data (Security violation)
- ❌ Don't use `any` type (TypeScript strict violation)
- ❌ Don't skip JSDoc documentation (Quality violation)
- ❌ Don't exceed 200 lines per file (Complexity violation)
- ❌ Don't use `innerHTML` with user data (XSS violation)
- ❌ Don't ignore failing tests (Quality violation)

## Critical Reminders

### Security First
- ALL user input must be sanitized (see security-considerations.md)
- URL data is untrusted - validate before use
- Use Zod schemas for all external data validation
- Never use `innerHTML` with URL or localStorage data

### TypeScript Strict Mode
- No `any` types - use `unknown` if type is truly unknown
- Explicit return types for all functions
- Use `ReactElement` not `JSX.Element` for React 19

### Testing Standards
- Write test FIRST (red phase)
- Make it pass with minimal code (green phase)
- Refactor for clarity (refactor phase)
- Maintain 80%+ coverage always

### Documentation
- JSDoc for ALL exported functions, classes, types
- Include `@param`, `@returns`, `@throws`, `@example`
- File-level `@fileoverview` for each module

## Next Steps

1. **Set up monorepo structure** with workspaces
2. **Initialize packages/core** with Vite + TypeScript + Vitest
3. **Write first test** for PlayerStorage
4. **Make it pass** with minimal implementation
5. **Refactor** and document
6. **Identify next behavior** and repeat

---

**Remember**: This is BDD/TDD - let behaviors drive implementation. Build only what's needed for the current behavior. The library will emerge naturally from solving real problems.
