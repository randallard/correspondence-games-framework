# URL-Based Correspondence Game Framework
## A Guide to Building Serverless Turn-Based Games

## Overview

This approach allows players to play correspondence games by passing game state entirely through URLs, with no server-side storage required. Players simply share updated URLs after each turn, and local browser storage maintains game history.

---

## Core Principles

### 1. **Stateless Architecture**
- No server maintains game state
- Each URL contains complete game state
- Local browser storage tracks personal game history only
- Perfect for turn-based, asynchronous gameplay

### 2. **URL Structure Considerations**
- **Use hash fragments (`#`) instead of query strings (`?`)**
  - Hash fragments aren't sent to servers
  - Keeps game state purely client-side
  - Better privacy and reduced server load
- **URL length limits**: ~2000 characters (safe cross-browser)
- **Compression is essential** for complex game states

---

## Implementation Strategies

### State Encoding Methods

#### Option 1: JSON + Compression
Use the **lz-string** library to compress and encode game state:

```javascript
// Encoding
const gameState = { moves: [...], board: {...}, turn: 1 };
const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(gameState));
window.location.hash = compressed;

// Decoding
const compressed = window.location.hash.substring(1);
const gameState = JSON.parse(LZString.decompressFromEncodedURIComponent(compressed));
```

**Resource**: [Encoding Data in URL Query Strings - Medium](https://garrett-bodley.medium.com/encoding-data-inside-of-a-url-query-string-f286b7e20465)

#### Option 2: Custom Notation (Game-Specific)
For chess-like games, use established notations:
- **FEN (Forsyth-Edwards Notation)** for board state
- **PGN move notation** for move history
- Highly compact and human-readable

**Example**: Lichess uses this approach extensively
- `https://lichess.org/analysis/rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR`

---

## Key Technical Considerations

### 1. **State vs. Move History**
Choose your encoding strategy:

**Full State Approach**:
- Pros: Simple to implement, no state reconstruction needed
- Cons: Larger URLs, harder to compress
- Best for: Simple games with small state spaces

**Move History Approach**:
- Pros: Very compact, easily compressible, supports undo/redo
- Cons: Requires replaying moves to get current state
- Best for: Games with large state spaces but simple moves

### 2. **Local Storage Strategy**
```javascript
// Store game history locally (not in URL)
const gameHistory = {
  gameId: 'unique-id',
  opponent: 'player-name',
  moves: [...],
  created: timestamp
};
localStorage.setItem(`game-${gameId}`, JSON.stringify(gameHistory));
```

**Important**: Never use localStorage/sessionStorage in URLs - only for local history tracking

### 3. **URL Encoding**
Always properly encode your data:
```javascript
// Use encodeURIComponent for query parameters
const encoded = encodeURIComponent(gameState);

// Or use hash fragments (preferred)
window.location.hash = encodedState;
```

**Resource**: [How to Encode URL Parameters - Stack Overflow](https://stackoverflow.com/questions/8135132/how-to-encode-url-parameters)

### 4. **Validation & Cheating Prevention**
Without a server, you need client-side validation:
- Include checksums or hashes in the URL
- Validate all moves against game rules
- Consider cryptographic signatures for competitive play
- Accept that determined cheaters can manipulate state

---

## Real-World Examples

### Lichess (Chess)
**Analysis Board URLs**: 
- `https://lichess.org/analysis/standard/[FEN_NOTATION]`
- `https://lichess.org/analysis/pgn/e4_e5_Nf3_Nc6_d4`

**Resources**:
- [Lichess Analysis URL Stability Discussion](https://lichess.org/forum/lichess-feedback/lichess-analysis-url-stability)
- [Lichess API Documentation](https://lichess.org/api)

### Stack Overflow Examples
**Efficient Game Data Storage**:
- [How to Efficiently Store Game Data in URL](https://stackoverflow.com/questions/12426114/how-to-efficiently-store-game-data-in-a-url-query-string)

---

## Libraries & Tools

### React State Management
**use-query-params**
- React hook for managing URL query parameter state
- Automatic serialization/deserialization
- [NPM Package](https://www.npmjs.com/package/use-query-params)
- [GitHub Repository](https://github.com/pbeshai/use-query-params)

**react-url-query**
- Comprehensive URL state management
- [GitHub Repository](https://github.com/pbeshai/react-url-query)

### Compression Libraries
**lz-string**
- JavaScript string compression
- URI-safe compression built-in
- Can reduce state size by 60-90%
- Available via CDN: `https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js`

---

## Architecture Patterns

### Stateless Game Flow
```
1. Player A makes move
   ↓
2. Client validates move
   ↓
3. Client updates game state
   ↓
4. Client generates new URL with encoded state
   ↓
5. Player A shares URL with Player B
   ↓
6. Player B opens URL
   ↓
7. Client decodes state and renders game
   ↓
8. Repeat from step 1
```

### Local History Tracking
```javascript
const gameManager = {
  saveToHistory(gameState) {
    const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
    history.push({
      timestamp: Date.now(),
      state: gameState,
      opponent: gameState.opponent
    });
    localStorage.setItem('gameHistory', JSON.stringify(history));
  },
  
  loadHistory() {
    return JSON.parse(localStorage.getItem('gameHistory') || '[]');
  }
};
```

---

## Advantages & Disadvantages

### Advantages
✅ **Zero server costs** - completely client-side
✅ **No authentication needed** - just share links
✅ **Perfect privacy** - no data stored anywhere
✅ **Infinite scalability** - no backend to overload
✅ **Works offline** - can be implemented as PWA
✅ **Simple deployment** - just static hosting needed

### Disadvantages
❌ **No cheat prevention** - state is fully client-controlled
❌ **URL length limits** - complex games may hit limits
❌ **Manual sharing** - requires players to exchange URLs
❌ **No matchmaking** - players must find each other
❌ **No centralized history** - each player has their own records
❌ **State can be lost** - if URL is lost, game is lost

---

## Additional Resources

### Technical Documentation
- [MDN: encodeURIComponent()](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent)
- [Stateless Server Architecture Overview](https://www.sciencedirect.com/topics/computer-science/stateless-server)
- [RESTful API Statelessness](https://restfulapi.net/statelessness/)

### Discussion & Examples
- [Stateless Multiplayer Game Implementation - Software Engineering Stack Exchange](https://softwareengineering.stackexchange.com/questions/163294/is-it-possible-to-implement-a-completely-stateless-multiplayer-game)
- [Game State in URLs - GameDev.net](https://gamedev.net/forums/topic/690854-storing-hashes-as-game-states/)

---

## Best Practices Summary

1. **Always use hash fragments** (`#`) for game state
2. **Compress your state** using lz-string or similar
3. **Store move history, not full state** when possible
4. **Validate all moves client-side** before applying
5. **Use localStorage** only for personal game history
6. **Include game version** in state for backward compatibility
7. **Test URL length** - stay well under 2000 characters
8. **Provide copy-to-clipboard** functionality for easy sharing
9. **Consider adding checksums** to detect corrupted URLs
10. **Implement graceful error handling** for invalid URLs

---

## Getting Started Template

```html
<!DOCTYPE html>
<html>
<head>
    <title>URL-Based Game</title>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lz-string/1.4.4/lz-string.min.js"></script>
</head>
<body>
    <div id="game"></div>
    <button onclick="shareGame()">Share Game</button>
    
    <script>
        // Initialize or load game from URL
        function initGame() {
            const hash = window.location.hash.substring(1);
            if (hash) {
                const compressed = decodeURIComponent(hash);
                const stateJson = LZString.decompressFromEncodedURIComponent(compressed);
                return JSON.parse(stateJson);
            }
            return { moves: [], turn: 0 }; // New game
        }
        
        // Update URL with new state
        function updateGameUrl(gameState) {
            const json = JSON.stringify(gameState);
            const compressed = LZString.compressToEncodedURIComponent(json);
            window.location.hash = encodeURIComponent(compressed);
        }
        
        // Copy URL to clipboard
        function shareGame() {
            const url = window.location.href;
            navigator.clipboard.writeText(url);
            alert('Game link copied! Share it with your opponent.');
        }
        
        // Your game logic here
        let gameState = initGame();
    </script>
</body>
</html>
```

---

## Conclusion

URL-based correspondence games are a viable and elegant solution for turn-based games where real-time interaction isn't required. The approach works best for games with:
- Infrequent state changes
- Compressible game states
- Players willing to share links manually
- No need for competitive integrity enforcement

This architecture has been proven by sites like Lichess and countless hobby projects, offering a completely serverless gaming experience.
