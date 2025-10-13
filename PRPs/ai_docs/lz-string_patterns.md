# lz-string Library - URL-Safe Compression for Game State

**Version:** 1.5.0
**License:** MIT
**NPM:** https://www.npmjs.com/package/lz-string
**GitHub:** https://github.com/pieroxy/lz-string
**Official Docs:** https://pieroxy.net/blog/pages/lz-string/index.html

## Overview

LZ-string is a LZ-based compression algorithm for JavaScript, designed for storing large amounts of data in localStorage on mobile devices. It's particularly useful for compressing game state into URL-safe strings.

**Key Characteristics:**
- Fast compression for strings < 750,000 characters
- Multiple encoding options for different use cases
- Built-in TypeScript support (no @types package needed)
- URI-safe compression method for URL parameters
- 18M+ weekly downloads

## Installation

```bash
npm install lz-string
```

**Note:** lz-string now includes its own TypeScript definitions - no need for @types/lz-string.

## API Methods

### compressToEncodedURIComponent(input: string): string

Produces ASCII strings that are URI-safe (Base64 with URI-safe tweaks).

**Characteristics:**
- No need for additional URL encoding
- Output is ~166% larger than raw compress() method
- Introduced in v1.3.5
- Best for URL parameters and query strings

**Usage:**
```typescript
import LZString from 'lz-string';

const gameState = { player: 'Alice', score: 100, moves: ['e4', 'e5'] };
const compressed = LZString.compressToEncodedURIComponent(
  JSON.stringify(gameState)
);

// compressed is now URI-safe: "N4IgdghgtgpiBcIDKBXA..."
```

### decompressFromEncodedURIComponent(input: string): string | null

Decompresses strings created by compressToEncodedURIComponent.

**Return Values:**
- `string` - Successfully decompressed data
- `null` - Decompression failed (corrupted/invalid data)
- `null` if input is empty string (`""`)
- Empty string (`""`) if input is null

**Critical:** Always check for null return before using result!

## TypeScript Usage

### Import Methods

```typescript
// Default import (recommended)
import LZString from 'lz-string';

// Named imports
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from 'lz-string';

// Aliased imports
import {
  compressToEncodedURIComponent as compress
} from 'lz-string';
```

### Type-Safe Wrapper

```typescript
interface CompressionResult {
  success: boolean;
  data?: string;
  error?: string;
}

function safeCompress(data: unknown): CompressionResult {
  try {
    const json = JSON.stringify(data);
    const compressed = LZString.compressToEncodedURIComponent(json);

    if (!compressed) {
      return { success: false, error: 'Compression returned empty' };
    }

    return { success: true, data: compressed };
  } catch (error) {
    return {
      success: false,
      error: `Compression failed: ${error}`
    };
  }
}

function safeDecompress<T>(compressed: string): CompressionResult {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

    if (decompressed === null) {
      return {
        success: false,
        error: 'Decompression returned null - corrupt data'
      };
    }

    const parsed = JSON.parse(decompressed) as T;
    return { success: true, data: JSON.stringify(parsed) };
  } catch (error) {
    return {
      success: false,
      error: `Decompression failed: ${error}`
    };
  }
}
```

## Game State Compression Patterns

### Basic Game State in URL

```typescript
import LZString from 'lz-string';

interface GameState {
  player1: string;
  player2: string;
  board: string[][];
  currentTurn: number;
}

// Compress state for URL
function compressGameState(state: GameState): string {
  return LZString.compressToEncodedURIComponent(
    JSON.stringify(state)
  );
}

// Decompress state from URL
function decompressGameState(compressed: string): GameState | null {
  try {
    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

    if (decompressed === null) {
      console.error('Failed to decompress: null returned');
      return null;
    }

    return JSON.parse(decompressed) as GameState;
  } catch (error) {
    console.error('Failed to parse game state:', error);
    return null;
  }
}

// Usage in React component
function GameComponent() {
  const params = new URLSearchParams(window.location.search);
  const compressedState = params.get('state');

  if (compressedState) {
    const state = decompressGameState(compressedState);
    if (state) {
      // Load game state
    } else {
      // Handle error - show error message or load default state
    }
  }
}
```

### Delta Encoding Pattern

For large game states, compress only the changes (deltas):

```typescript
interface GameDelta {
  moveNumber: number;
  changes: Partial<GameState>;
}

function compressDelta(previousState: GameState, currentState: GameState): string {
  const delta: GameDelta = {
    moveNumber: currentState.currentTurn,
    changes: {}
  };

  // Only include changed properties
  for (const key in currentState) {
    if (JSON.stringify(previousState[key]) !== JSON.stringify(currentState[key])) {
      delta.changes[key as keyof GameState] = currentState[key as keyof GameState];
    }
  }

  return LZString.compressToEncodedURIComponent(JSON.stringify(delta));
}

function applyDelta(baseState: GameState, compressedDelta: string): GameState | null {
  const decompressed = LZString.decompressFromEncodedURIComponent(compressedDelta);

  if (decompressed === null) return null;

  try {
    const delta = JSON.parse(decompressed) as GameDelta;
    return { ...baseState, ...delta.changes };
  } catch {
    return null;
  }
}
```

### URL State Management

```typescript
function updateURLWithGameState(state: GameState): void {
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(state)
  );

  const url = new URL(window.location.href);
  url.searchParams.set('state', compressed);

  // Update URL without page reload
  window.history.replaceState({}, '', url.toString());
}

function loadGameStateFromURL(): GameState | null {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get('state');

  if (!compressed) return null;

  const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

  if (decompressed === null) {
    console.warn('Failed to decompress state from URL');
    return null;
  }

  try {
    return JSON.parse(decompressed) as GameState;
  } catch (error) {
    console.error('Failed to parse state:', error);
    return null;
  }
}
```

## Error Handling Best Practices

### Always Check for Null

```typescript
// BAD - No null check
const decompressed = LZString.decompressFromEncodedURIComponent(data);
const state = JSON.parse(decompressed); // Will crash if decompressed is null!

// GOOD - Proper null handling
const decompressed = LZString.decompressFromEncodedURIComponent(data);

if (decompressed === null) {
  console.error('Decompression failed - using default state');
  return getDefaultGameState();
}

try {
  const state = JSON.parse(decompressed);
  return state;
} catch (error) {
  console.error('JSON parse failed:', error);
  return getDefaultGameState();
}
```

### Fallback Strategy Pattern

```typescript
function loadGameStateWithFallback(
  compressed: string,
  fallback: GameState
): GameState {
  // Attempt decompression
  const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

  if (decompressed === null) {
    console.warn('Decompression failed, using fallback');
    return fallback;
  }

  // Attempt JSON parsing
  try {
    const state = JSON.parse(decompressed) as GameState;

    // Validate structure
    if (!isValidGameState(state)) {
      console.warn('Invalid state structure, using fallback');
      return fallback;
    }

    return state;
  } catch (error) {
    console.warn('Parse error, using fallback:', error);
    return fallback;
  }
}

function isValidGameState(state: any): state is GameState {
  return (
    state !== null &&
    typeof state === 'object' &&
    'player1' in state &&
    'player2' in state &&
    'board' in state &&
    'currentTurn' in state
  );
}
```

### Error Recovery with User Feedback

```typescript
interface LoadResult<T> {
  success: boolean;
  data?: T;
  error?: {
    code: 'DECOMPRESS_FAILED' | 'PARSE_FAILED' | 'VALIDATION_FAILED';
    message: string;
  };
}

function loadGameStateWithErrors(compressed: string): LoadResult<GameState> {
  // Step 1: Decompress
  const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

  if (decompressed === null) {
    return {
      success: false,
      error: {
        code: 'DECOMPRESS_FAILED',
        message: 'Failed to decompress game state. The URL may be corrupted.'
      }
    };
  }

  // Step 2: Parse JSON
  let parsed: any;
  try {
    parsed = JSON.parse(decompressed);
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'PARSE_FAILED',
        message: 'Failed to parse game state. The data format is invalid.'
      }
    };
  }

  // Step 3: Validate
  if (!isValidGameState(parsed)) {
    return {
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Game state is missing required fields or has invalid data.'
      }
    };
  }

  return {
    success: true,
    data: parsed
  };
}

// Usage in React
function GameLoader() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compressed = params.get('state');

    if (compressed) {
      const result = loadGameStateWithErrors(compressed);

      if (!result.success) {
        setError(result.error?.message || 'Unknown error');
        // Initialize with default state
        initializeDefaultGame();
      } else {
        setError(null);
        initializeGame(result.data!);
      }
    }
  }, []);

  if (error) {
    return <div className="error">Error loading game: {error}</div>;
  }

  return <GameBoard />;
}
```

## Common Errors and Solutions

### Error: Decompression Returns Null

**Cause:** Dictionary lookup fails during decompression (corrupted/invalid data)

**Solution:**
```typescript
const decompressed = LZString.decompressFromEncodedURIComponent(data);

if (decompressed === null) {
  // Data is corrupted - use fallback
  console.error('Decompression failed - data corrupted');
  return getDefaultState();
}
```

### Error: URL Contains '+' Characters

**Cause:** '+' is a reserved URI character that can be interpreted as whitespace

**Solution:** Use compressToEncodedURIComponent (not compressToBase64) - it's designed to be URI-safe

```typescript
// GOOD - URI safe
const compressed = LZString.compressToEncodedURIComponent(data);

// BAD - May contain '+' which becomes space in URLs
const compressed = LZString.compressToBase64(data);
```

### Error: "Strange Characters" After Decompression

**Cause:** Escape characters or encoding mismatches

**Solution:** JSON.stringify before compress, JSON.parse after decompress

```typescript
// GOOD - Proper escaping
const compressed = LZString.compressToEncodedURIComponent(
  JSON.stringify(gameState)
);

const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
if (decompressed) {
  const state = JSON.parse(decompressed);
}

// BAD - Direct string compression may have encoding issues
const compressed = LZString.compressToEncodedURIComponent(gameState.toString());
```

### Error: Performance Issues with Large States

**Cause:** States > 750,000 characters are slow with lz-string

**Solutions:**
1. Use delta encoding (only compress changes)
2. Reduce state size before compression (remove redundant data)
3. Consider async compression for very large states

```typescript
import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent
} from 'async-lz-string';

async function compressLargeState(state: GameState): Promise<string> {
  const json = JSON.stringify(state);

  if (json.length > 500000) {
    console.warn('Large state detected, using async compression');
    return await compressToEncodedURIComponent(json);
  }

  return LZString.compressToEncodedURIComponent(json);
}
```

## Size Optimization Tips

### 1. Pre-process JSON Before Compression

```typescript
// Remove empty/default values
function optimizeStateForCompression(state: GameState): GameState {
  return {
    ...state,
    // Remove default values that can be reconstructed
    board: state.board.map(row =>
      row.map(cell => cell === '' ? undefined : cell)
    ).filter(row => row.some(cell => cell !== undefined))
  };
}
```

### 2. Use Short Property Names

```typescript
// Instead of this:
interface VerboseState {
  currentPlayerName: string;
  totalNumberOfMoves: number;
  gameBoard: string[][];
}

// Use this:
interface CompactState {
  p: string;  // player
  m: number;  // moves
  b: string[][]; // board
}
```

### 3. Array Serialization

Arrays compress better than objects:

```typescript
// Less efficient
const state = { x: 1, y: 2, z: 3, w: 4 };

// More efficient (34.2% of original size)
const state = [1, 2, 3, 4];
```

### 4. Combine Techniques

```typescript
function optimizeAndCompress(state: GameState): string {
  // 1. Remove defaults
  const optimized = optimizeStateForCompression(state);

  // 2. Convert to array format
  const array = [
    optimized.player1,
    optimized.player2,
    optimized.currentTurn,
    optimized.board
  ];

  // 3. Compress
  return LZString.compressToEncodedURIComponent(
    JSON.stringify(array)
  );
}
```

## Compression Method Comparison

| Method | Output Size | Use Case | URI Safe |
|--------|-------------|----------|----------|
| `compress()` | 100% (baseline) | localStorage (webkit only) | No |
| `compressToUTF16()` | ~100% | localStorage (all browsers) | No |
| `compressToBase64()` | ~166% | General purpose | No |
| `compressToEncodedURIComponent()` | ~166% | URLs, query params | Yes |
| `compressToUint8Array()` | Most efficient | Binary transmission | No |

**For URL-based game state: Always use `compressToEncodedURIComponent()`**

## Performance Benchmarks

String Size vs Performance:
- **< 750 chars**: lz-string is 10x faster than LZMA, smaller output
- **< 100,000 chars**: lz-string is 10x faster than LZMA, bigger output
- **> 750,000 chars**: lz-string is slower than LZMA, bigger output

Compression Ratios (4MB JSON file):
- lz-string UTF16: 607KB
- lz-string raw: 576KB
- lz-string base64: 519KB

**Recommendation:** lz-string is ideal for game states < 100KB (typical use case)

## Browser Compatibility

Works on all modern browsers:
- Chrome/Edge
- Firefox
- Safari
- Mobile browsers (iOS Safari, Android Chrome)

Tested on:
- IE 9-10 (for UTF16 method)
- All modern browsers (for EncodedURIComponent)

## Known Issues and Workarounds

### Issue: Spaces in URLs (IE11)

**Problem:** IE11 may fail decompression if URL contains spaces

**Workaround:**
```typescript
function decompressFromURL(urlParam: string): string | null {
  // Replace spaces with '+' before decompression (IE11 fix)
  const normalized = urlParam.replace(/ /g, '+');
  return LZString.decompressFromEncodedURIComponent(normalized);
}
```

### Issue: URL Length Limits

**Problem:** URLs have length limits (2048 chars in IE, ~65k in modern browsers)

**Solution:** Monitor compressed size
```typescript
function compressWithSizeCheck(state: GameState): string | null {
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(state)
  );

  if (compressed.length > 2000) {
    console.warn('Compressed state exceeds safe URL length');
    // Consider delta encoding or server-side storage
    return null;
  }

  return compressed;
}
```

## Real-World Example: Correspondence Game Framework

```typescript
// Game state structure
interface CorrespondenceGameState {
  gameId: string;
  player1: { name: string; emoji?: string };
  player2: { name: string; emoji?: string };
  moves: string[];
  board: string[][];
  currentTurn: 'player1' | 'player2';
  gameStatus: 'waiting' | 'active' | 'complete';
  winner?: 'player1' | 'player2' | 'draw';
}

// Compress for sharing
function createShareableURL(state: CorrespondenceGameState): string {
  const compressed = LZString.compressToEncodedURIComponent(
    JSON.stringify(state)
  );

  const baseURL = window.location.origin + window.location.pathname;
  return `${baseURL}?game=${compressed}`;
}

// Load from shared URL
function loadFromSharedURL(): CorrespondenceGameState | null {
  const params = new URLSearchParams(window.location.search);
  const compressed = params.get('game');

  if (!compressed) return null;

  const decompressed = LZString.decompressFromEncodedURIComponent(compressed);

  if (decompressed === null) {
    console.error('Failed to load game from URL - data corrupted');
    return null;
  }

  try {
    const state = JSON.parse(decompressed) as CorrespondenceGameState;

    // Validate structure
    if (!state.gameId || !state.player1 || !state.board) {
      console.error('Invalid game state structure');
      return null;
    }

    return state;
  } catch (error) {
    console.error('Failed to parse game state:', error);
    return null;
  }
}

// React Hook for URL state management
function useURLGameState(initialState: CorrespondenceGameState) {
  const [state, setState] = useState<CorrespondenceGameState>(() => {
    // Try to load from URL first
    const urlState = loadFromSharedURL();
    return urlState || initialState;
  });

  // Update URL whenever state changes
  useEffect(() => {
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(state)
    );

    const url = new URL(window.location.href);
    url.searchParams.set('game', compressed);

    window.history.replaceState({}, '', url.toString());
  }, [state]);

  return [state, setState] as const;
}
```

## Testing Patterns

```typescript
describe('lz-string compression', () => {
  const testState: GameState = {
    player1: 'Alice',
    player2: 'Bob',
    board: [['X', 'O', ''], ['', 'X', ''], ['', '', 'O']],
    currentTurn: 1
  };

  test('compresses and decompresses successfully', () => {
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(testState)
    );

    expect(compressed).toBeTruthy();
    expect(typeof compressed).toBe('string');

    const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
    expect(decompressed).not.toBeNull();

    const parsed = JSON.parse(decompressed!);
    expect(parsed).toEqual(testState);
  });

  test('handles corrupted data gracefully', () => {
    const corrupted = 'invalid-compressed-data';
    const result = LZString.decompressFromEncodedURIComponent(corrupted);

    expect(result).toBeNull();
  });

  test('compressed string is URI-safe', () => {
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(testState)
    );

    // Should not contain URI-unsafe characters
    expect(compressed).not.toMatch(/[+]/);
    expect(compressed).not.toMatch(/[\s]/);
    expect(compressed).not.toMatch(/[=]/);
  });

  test('works in URL query parameters', () => {
    const compressed = LZString.compressToEncodedURIComponent(
      JSON.stringify(testState)
    );

    const url = `http://example.com?state=${compressed}`;
    const params = new URLSearchParams(new URL(url).search);
    const retrieved = params.get('state');

    expect(retrieved).toBe(compressed);

    const decompressed = LZString.decompressFromEncodedURIComponent(retrieved!);
    const parsed = JSON.parse(decompressed!);

    expect(parsed).toEqual(testState);
  });
});
```

## Summary: Key Takeaways

1. **Always check for null** when decompressing - it indicates failure
2. **Use JSON.stringify/parse** around compress/decompress for complex objects
3. **Use compressToEncodedURIComponent** for URL-based game state
4. **Implement fallback strategies** for error recovery
5. **Test with real URLs** to ensure URI safety
6. **Monitor compression size** - keep URLs < 2048 chars for IE compatibility
7. **Consider delta encoding** for large or frequently-changing states
8. **Validate decompressed data** before using it
9. **Provide user feedback** when decompression fails
10. **No @types package needed** - lz-string includes TypeScript definitions

## Additional Resources

- Official Documentation: https://pieroxy.net/blog/pages/lz-string/index.html
- GitHub Repository: https://github.com/pieroxy/lz-string
- NPM Package: https://www.npmjs.com/package/lz-string
- Snyk Code Examples: https://snyk.io/advisor/npm-package/lz-string
- Alternative Library (JSONCrush): https://github.com/KilledByAPixel/JSONCrush

---

**Last Updated:** 2025-10-13
**lz-string Version:** 1.5.0
**Framework:** Correspondence Games Framework
