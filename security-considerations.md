# Security Guide for URL-Based Games
## Protecting Against Attacks in Stateless Game Systems

## Table of Contents
1. [Security Threat Overview](#security-threat-overview)
2. [SecureGameManager Implementation](#securegamemanager-implementation)
3. [Security Considerations](#security-considerations)
4. [Additional Resources](#additional-resources)

---

## Security Threat Overview

When building URL-based games, you're accepting user-controlled data directly into your application. This creates several attack vectors that must be addressed.

### Primary Threats

1. **Cross-Site Scripting (XSS)** - Injecting malicious scripts via URL
2. **State Tampering** - Modifying game state to cheat
3. **Replay Attacks** - Resubmitting old game states
4. **Denial of Service** - Overwhelming the client with massive URLs
5. **Man-in-the-Middle** - Intercepting and modifying game URLs

**Key Principle**: The browser won't execute JavaScript from hash fragments until your code explicitly processes them, BUT once your code starts parsing, vulnerabilities can be exploited. You must validate BEFORE doing anything with the data.

---

## SecureGameManager Implementation

### Complete Secure Game Manager

```javascript
/**
 * SecureGameManager - Handles secure loading and validation of URL-based game states
 * Implements defense-in-depth with multiple validation layers
 */
class SecureGameManager {
    constructor(sharedSecret, gameVersion = '1.0') {
        this.secret = sharedSecret;
        this.gameVersion = gameVersion;
        this.MAX_URL_LENGTH = 3000;
        this.MAX_MOVES = 500;
    }
    
    /**
     * Safely loads and validates game state from URL
     * @returns {Object|null} Validated game state or null if invalid
     */
    async loadGameFromURL() {
        try {
            // Step 1: Extract and basic validation
            const hash = window.location.hash.substring(1);
            if (!hash || hash.length > this.MAX_URL_LENGTH) {
                throw new Error('Invalid URL format or length');
            }
            
            // Step 2: Split data and signature
            const parts = hash.split('.');
            if (parts.length !== 2) {
                throw new Error('Invalid URL structure');
            }
            
            const [compressed, hmac] = parts;
            
            // Step 3: Verify HMAC BEFORE decompression
            // This prevents processing of tampered data
            if (!await this.verifyHMAC(compressed, hmac)) {
                throw new Error('Tampered game state detected!');
            }
            
            // Step 4: Decompress
            const json = LZString.decompressFromEncodedURIComponent(compressed);
            if (!json) {
                throw new Error('Decompression failed');
            }
            
            // Step 5: Parse JSON safely
            let gameState;
            try {
                gameState = JSON.parse(json);
            } catch (e) {
                throw new Error('Invalid game data format');
            }
            
            // Step 6: Validate game state structure and rules
            this.validateGameState(gameState);
            
            // Step 7: Sanitize any user-provided strings
            gameState = this.sanitizeGameState(gameState);
            
            // Step 8: Store in local history
            this.saveToLocalHistory(gameState);
            
            return gameState;
            
        } catch (error) {
            console.error('Security validation failed:', error);
            // Show user-friendly error without exposing details
            this.showSecurityError();
            return null;
        }
    }
    
    /**
     * Creates a secure URL with game state and HMAC
     * @param {Object} gameState - Current game state
     * @returns {string} URL hash fragment with HMAC
     */
    async createSecureURL(gameState) {
        // Add metadata
        gameState.version = this.gameVersion;
        gameState.timestamp = Date.now();
        gameState.turnNumber = gameState.moves.length;
        
        // Serialize and compress
        const json = JSON.stringify(gameState);
        const compressed = LZString.compressToEncodedURIComponent(json);
        
        // Generate HMAC
        const hmac = await this.generateHMAC(compressed);
        
        // Combine data and signature
        return `#${compressed}.${hmac}`;
    }
    
    /**
     * Validates game state structure and rules
     * @param {Object} state - Game state to validate
     * @throws {Error} If validation fails
     */
    validateGameState(state) {
        // 1. Required fields exist
        if (!state.version || !state.moves || !Array.isArray(state.moves)) {
            throw new Error('Invalid game state structure');
        }
        
        // 2. Version compatibility
        if (state.version !== this.gameVersion) {
            throw new Error(`Incompatible game version: ${state.version}`);
        }
        
        // 3. Reasonable constraints
        if (state.moves.length > this.MAX_MOVES) {
            throw new Error('Suspiciously long move list');
        }
        
        // 4. Timestamp validation (prevent old replays)
        if (state.timestamp) {
            const age = Date.now() - state.timestamp;
            const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
            if (age > MAX_AGE) {
                throw new Error('Game state too old');
            }
        }
        
        // 5. Turn number validation (prevent replay attacks)
        const lastKnownTurn = this.getLastKnownTurn(state.gameId);
        if (lastKnownTurn !== null && state.turnNumber <= lastKnownTurn) {
            throw new Error('Turn number not advancing (replay attack?)');
        }
        
        // 6. Replay all moves to verify game state is valid
        this.replayAndValidateMoves(state.moves);
    }
    
    /**
     * Replays and validates all moves according to game rules
     * @param {Array} moves - Array of moves to validate
     * @throws {Error} If any move is illegal
     */
    replayAndValidateMoves(moves) {
        // Implement game-specific move validation
        // Example for chess-like game:
        let boardState = this.createInitialBoard();
        
        for (let i = 0; i < moves.length; i++) {
            const move = moves[i];
            
            // Validate move format
            if (!this.isValidMoveFormat(move)) {
                throw new Error(`Invalid move format at position ${i}`);
            }
            
            // Validate move is legal for current board state
            if (!this.isLegalMove(move, boardState)) {
                throw new Error(`Illegal move at position ${i}`);
            }
            
            // Apply move to board
            boardState = this.applyMove(move, boardState);
        }
        
        return boardState;
    }
    
    /**
     * Sanitizes user-controlled strings to prevent XSS
     * @param {Object} state - Game state to sanitize
     * @returns {Object} Sanitized game state
     */
    sanitizeGameState(state) {
        const sanitize = (str) => {
            if (typeof str !== 'string') return str;
            
            // HTML entity encoding
            return str
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#x27;')
                .replace(/\//g, '&#x2F;');
        };
        
        // Sanitize all string fields that might be displayed
        const sanitizedState = { ...state };
        
        if (sanitizedState.playerName) {
            sanitizedState.playerName = sanitize(sanitizedState.playerName);
        }
        
        if (sanitizedState.gameTitle) {
            sanitizedState.gameTitle = sanitize(sanitizedState.gameTitle);
        }
        
        if (sanitizedState.notes) {
            sanitizedState.notes = sanitize(sanitizedState.notes);
        }
        
        return sanitizedState;
    }
    
    /**
     * Generates HMAC signature for data
     * @param {string} data - Data to sign
     * @returns {string} Base64-encoded HMAC signature
     */
    async generateHMAC(data) {
        const encoder = new TextEncoder();
        
        // Import secret as crypto key
        const key = await crypto.subtle.importKey(
            'raw',
            encoder.encode(this.secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['sign']
        );
        
        // Generate signature
        const signature = await crypto.subtle.sign(
            'HMAC',
            key,
            encoder.encode(data)
        );
        
        // Convert to base64
        return btoa(String.fromCharCode(...new Uint8Array(signature)));
    }
    
    /**
     * Verifies HMAC signature
     * @param {string} data - Data to verify
     * @param {string} signature - HMAC signature to check
     * @returns {boolean} True if signature is valid
     */
    async verifyHMAC(data, signature) {
        const expectedSignature = await this.generateHMAC(data);
        
        // Constant-time comparison to prevent timing attacks
        if (signature.length !== expectedSignature.length) {
            return false;
        }
        
        let result = 0;
        for (let i = 0; i < signature.length; i++) {
            result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
        }
        
        return result === 0;
    }
    
    /**
     * Safely renders game state without XSS vulnerabilities
     * @param {Object} gameState - Game state to render
     * @param {HTMLElement} container - Container element
     */
    renderGameState(gameState, container) {
        // Clear container safely
        container.innerHTML = '';
        
        // Create elements programmatically (safe from XSS)
        const playerNameElement = document.createElement('div');
        playerNameElement.className = 'player-name';
        playerNameElement.textContent = gameState.playerName; // Safe!
        
        const turnElement = document.createElement('div');
        turnElement.className = 'turn-counter';
        turnElement.textContent = `Turn: ${gameState.turnNumber}`;
        
        container.appendChild(playerNameElement);
        container.appendChild(turnElement);
        
        // Render board state
        this.renderBoard(gameState.board, container);
    }
    
    /**
     * Saves game state to local history
     * @param {Object} gameState - Game state to save
     */
    saveToLocalHistory(gameState) {
        try {
            const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
            
            history.push({
                gameId: gameState.gameId,
                timestamp: Date.now(),
                turnNumber: gameState.turnNumber,
                opponent: gameState.opponent
            });
            
            // Keep only last 100 games
            const recentHistory = history.slice(-100);
            localStorage.setItem('gameHistory', JSON.stringify(recentHistory));
        } catch (e) {
            console.warn('Could not save to local history:', e);
        }
    }
    
    /**
     * Gets last known turn number for a game
     * @param {string} gameId - Game identifier
     * @returns {number|null} Last known turn or null
     */
    getLastKnownTurn(gameId) {
        try {
            const history = JSON.parse(localStorage.getItem('gameHistory') || '[]');
            const gameHistory = history.filter(h => h.gameId === gameId);
            
            if (gameHistory.length === 0) return null;
            
            return Math.max(...gameHistory.map(h => h.turnNumber));
        } catch (e) {
            return null;
        }
    }
    
    /**
     * Shows user-friendly security error
     */
    showSecurityError() {
        alert('This game link appears to be invalid or has been tampered with. Please request a new link from your opponent.');
    }
    
    // Game-specific methods (implement based on your game)
    createInitialBoard() {
        // Return initial board state
        return {};
    }
    
    isValidMoveFormat(move) {
        // Validate move format
        return true;
    }
    
    isLegalMove(move, boardState) {
        // Validate move is legal
        return true;
    }
    
    applyMove(move, boardState) {
        // Apply move and return new state
        return boardState;
    }
    
    renderBoard(board, container) {
        // Render board UI
    }
}

// Usage Example
async function initSecureGame() {
    // Shared secret (agreed upon by both players)
    const sharedSecret = prompt('Enter game password:');
    
    const gameManager = new SecureGameManager(sharedSecret);
    
    // Load game from URL
    const gameState = await gameManager.loadGameFromURL();
    
    if (gameState) {
        // Render game
        const container = document.getElementById('game');
        gameManager.renderGameState(gameState, container);
    } else {
        // Start new game
        const newGame = {
            gameId: crypto.randomUUID(),
            moves: [],
            playerName: 'Player 1',
            board: gameManager.createInitialBoard()
        };
        
        // Create URL for opponent
        const url = window.location.origin + window.location.pathname + 
                    await gameManager.createSecureURL(newGame);
        
        console.log('Share this URL with your opponent:', url);
    }
}
```

---

## Security Considerations

### 1. Cross-Site Scripting (XSS) Prevention

**The Threat**: Malicious code injected via URL parameters that executes in the victim's browser.

**Attack Example**:
```
game.html#{"playerName":"<img src=x onerror='alert(document.cookie)'>"}
```

**Mitigation Strategies**:

1. **Never use `innerHTML` with URL data**
   ```javascript
   // ❌ DANGEROUS
   element.innerHTML = gameState.playerName;
   
   // ✅ SAFE
   element.textContent = gameState.playerName;
   ```

2. **Sanitize all user-controlled strings**
   ```javascript
   function sanitizeHTML(str) {
       return str
           .replace(/&/g, '&amp;')
           .replace(/</g, '&lt;')
           .replace(/>/g, '&gt;')
           .replace(/"/g, '&quot;')
           .replace(/'/g, '&#x27;');
   }
   ```

3. **Use Content Security Policy (CSP)**
   ```html
   <meta http-equiv="Content-Security-Policy" 
         content="default-src 'self'; script-src 'self' cdnjs.cloudflare.com">
   ```

**Reputable Sources**:
- [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [Google: CSP Evaluator](https://csp-evaluator.withgoogle.com/)
- [PortSwigger: Cross-site scripting](https://portswigger.net/web-security/cross-site-scripting)

---

### 2. HMAC Authentication (Tamper Detection)

**The Threat**: Players modifying game state to cheat, or attackers corrupting game data.

**Why Encryption Alone Fails**: Encryption provides confidentiality but not integrity. An attacker can modify ciphertext, and if decryption succeeds, you have invalid state.

**HMAC Solution**: Hash-based Message Authentication Code verifies data hasn't been modified.

**Implementation**:
```javascript
// Creating HMAC
const data = JSON.stringify(gameState);
const hmac = crypto.subtle.sign('HMAC', key, data);

// Verifying HMAC (constant-time comparison)
function verifyHMAC(data, signature, expectedSignature) {
    if (signature.length !== expectedSignature.length) return false;
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
        result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    return result === 0;
}
```

**Key Points**:
- HMAC must be computed BEFORE any processing
- Use constant-time comparison to prevent timing attacks
- SHA-256 is standard for HMAC operations

**Reputable Sources**:
- [RFC 2104: HMAC Specification](https://www.ietf.org/rfc/rfc2104.txt)
- [NIST: HMAC (FIPS 198-1)](https://csrc.nist.gov/publications/detail/fips/198/1/final)
- [MDN: SubtleCrypto.sign()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/sign)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

### 3. Replay Attack Prevention

**The Threat**: Attacker resends old game state where they had an advantage.

**Attack Example**:
```
// Turn 5: Player A is winning
game.html#[state-at-turn-5]

// Turn 10: Player B is winning  
// Player A resends turn 5 URL
```

**Mitigation Strategies**:

1. **Monotonic Turn Counter**
   ```javascript
   if (newState.turnNumber <= lastKnownTurn) {
       throw new Error('Turn number must increase');
   }
   ```

2. **Timestamp Validation**
   ```javascript
   const age = Date.now() - state.timestamp;
   const MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days
   if (age > MAX_AGE) {
       throw new Error('Game state expired');
   }
   ```

3. **Local History Tracking**
   ```javascript
   // Store all received turn numbers
   const history = JSON.parse(localStorage.getItem('gameHistory'));
   history.push({ gameId, turnNumber, timestamp });
   ```

**Reputable Sources**:
- [OWASP: Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [Wikipedia: Replay attack](https://en.wikipedia.org/wiki/Replay_attack)
- [NIST SP 800-63B: Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

---

### 4. State Validation and Move Verification

**The Threat**: Invalid or impossible game states that violate game rules.

**Attack Example**:
```javascript
// Chess: Queen moves 10 squares diagonally (impossible)
// Or: Both players' kings are in check simultaneously
```

**Mitigation Strategy**: Replay all moves from initial state.

```javascript
replayAndValidateMoves(moves) {
    let boardState = createInitialBoard();
    
    for (const move of moves) {
        // Validate format
        if (!isValidMoveFormat(move)) {
            throw new Error('Invalid move format');
        }
        
        // Validate legality
        if (!isLegalMove(move, boardState)) {
            throw new Error('Illegal move detected');
        }
        
        // Apply move
        boardState = applyMove(move, boardState);
    }
    
    return boardState;
}
```

**Key Points**:
- Store move history, not just final state
- Validate EVERY move in sequence
- Check game-specific rules (check, checkmate, etc.)
- Verify state consistency

**Reputable Sources**:
- [OWASP: Input Validation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Chess Programming Wiki: Move Validation](https://www.chessprogramming.org/Move_Generation)
- [Game Programming Patterns: Command Pattern](https://gameprogrammingpatterns.com/command.html)

---

### 5. Denial of Service (DoS) Prevention

**The Threat**: Massive URLs or computationally expensive operations that hang the browser.

**Attack Examples**:
```javascript
// 10MB compressed data
game.html#[10,000,000 characters]

// Infinite loop via crafted state
game.html#{"recursiveData": {...deeply nested...}}
```

**Mitigation Strategies**:

1. **URL Length Limits**
   ```javascript
   const MAX_URL_LENGTH = 3000;
   if (hash.length > MAX_URL_LENGTH) {
       throw new Error('URL too long');
   }
   ```

2. **Decompression Limits**
   ```javascript
   const decompressed = LZString.decompress(compressed);
   if (decompressed.length > 100000) { // 100KB limit
       throw new Error('Decompressed data too large');
   }
   ```

3. **Move Count Limits**
   ```javascript
   const MAX_MOVES = 500;
   if (state.moves.length > MAX_MOVES) {
       throw new Error('Too many moves');
   }
   ```

4. **Timeout Operations**
   ```javascript
   const timeoutPromise = new Promise((_, reject) => 
       setTimeout(() => reject('Operation timeout'), 5000)
   );
   
   const result = await Promise.race([
       validateMoves(state),
       timeoutPromise
   ]);
   ```

**Reputable Sources**:
- [OWASP: Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [RFC 7230: HTTP/1.1 Message Syntax (URI length)](https://www.rfc-editor.org/rfc/rfc7230#section-3.1.1)
- [MDN: Maximum URL length](https://stackoverflow.com/questions/417142/what-is-the-maximum-length-of-a-url-in-different-browsers)

---

### 6. Timing Attack Prevention

**The Threat**: Attackers measure response times to gain information about secret values.

**Attack Example**:
```javascript
// Standard string comparison (vulnerable)
function compareSignatures(sig1, sig2) {
    if (sig1.length !== sig2.length) return false;
    
    for (let i = 0; i < sig1.length; i++) {
        if (sig1[i] !== sig2[i]) return false; // Returns early!
    }
    return true;
}
// Attacker measures time to deduce correct characters
```

**Mitigation**: Constant-time comparison

```javascript
function constantTimeCompare(a, b) {
    if (a.length !== b.length) return false;
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0; // Always checks all characters
}
```

**Reputable Sources**:
- [OWASP: Timing Attack](https://owasp.org/www-community/attacks/Timing_attack)
- [Cryptocoding: Constant Time Comparison](https://github.com/veorq/cryptocoding#compare-secret-strings-in-constant-time)
- [Node.js crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#crypto_crypto_timingsafeequal_a_b)

---

### 7. JSON Parsing Security

**The Threat**: Malformed or malicious JSON causing errors or exploitation.

**Attack Examples**:
```javascript
// Prototype pollution
{"__proto__": {"isAdmin": true}}

// Deeply nested objects (stack overflow)
{"a":{"b":{"c":{...1000 levels deep...}}}}
```

**Mitigation Strategies**:

1. **Wrap in try-catch**
   ```javascript
   try {
       const data = JSON.parse(jsonString);
   } catch (e) {
       throw new Error('Invalid JSON format');
   }
   ```

2. **Validate structure immediately**
   ```javascript
   function validateStructure(obj) {
       const allowedKeys = ['moves', 'board', 'player', 'version'];
       
       for (const key in obj) {
           if (!allowedKeys.includes(key)) {
               throw new Error(`Unexpected key: ${key}`);
           }
       }
   }
   ```

3. **Freeze parsed objects**
   ```javascript
   const gameState = Object.freeze(JSON.parse(jsonString));
   ```

**Reputable Sources**:
- [OWASP: Deserialization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Deserialization_Cheat_Sheet.html)
- [Prototype Pollution Attacks](https://github.com/HoLyVieR/prototype-pollution-nsec18)
- [JSON.parse() Security - Stack Overflow](https://stackoverflow.com/questions/3297858/how-dangerous-is-it-to-parse-a-string-with-json-parse)

---

### 8. Web Crypto API Best Practices

**The Threat**: Weak cryptography or improper key management.

**Best Practices**:

1. **Use SubtleCrypto (not deprecated crypto)**
   ```javascript
   // ✅ GOOD - Modern, secure API
   const signature = await crypto.subtle.sign('HMAC', key, data);
   
   // ❌ BAD - Deprecated
   const hash = crypto.createHash('md5'); // Never use MD5!
   ```

2. **Use Strong Algorithms**
   - HMAC with SHA-256 (minimum)
   - ECDSA with P-256 for signatures
   - AES-256-GCM for encryption

3. **Proper Key Derivation**
   ```javascript
   // Derive key from password using PBKDF2
   const key = await crypto.subtle.deriveKey(
       {
           name: 'PBKDF2',
           salt: salt,
           iterations: 100000,
           hash: 'SHA-256'
       },
       passwordKey,
       { name: 'HMAC', hash: 'SHA-256' },
       false,
       ['sign', 'verify']
   );
   ```

**Reputable Sources**:
- [MDN: Web Crypto API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Crypto_API)
- [W3C: Web Cryptography API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [NIST: Approved Algorithms](https://csrc.nist.gov/projects/cryptographic-algorithm-validation-program)
- [OWASP: Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)

---

### 9. Shared Secret Management

**The Threat**: Weak or compromised shared secrets between players.

**Challenge**: In a purely client-side system, secure key exchange is difficult.

**Practical Solutions**:

1. **Password-Based**
   ```javascript
   // Both players agree on a passphrase
   const passphrase = prompt('Enter game password:');
   
   // Derive strong key using PBKDF2
   const key = await deriveKeyFromPassword(passphrase);
   ```

2. **QR Code Exchange (In-Person)**
   ```javascript
   // Player 1 generates secret and displays QR code
   const secret = generateRandomSecret();
   displayQRCode(secret);
   
   // Player 2 scans QR code to get secret
   ```

3. **Initial URL Contains Secret**
   ```javascript
   // First URL includes shared secret (send via secure channel)
   game.html#secret=abc123&state=...
   
   // Subsequent URLs omit secret (use stored value)
   ```

**Best Practices**:
- Use at least 128 bits of entropy
- Consider using Diffie-Hellman for key exchange
- For high-stakes games, use public-key cryptography

**Reputable Sources**:
- [NIST: Recommendation for Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
- [OWASP: Key Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html)
- [RFC 5869: HKDF (HMAC-based Key Derivation)](https://www.rfc-editor.org/rfc/rfc5869)

---

### 10. Content Security Policy (CSP)

**The Threat**: Even with sanitization, additional XSS protection is valuable.

**Implementation**:

```html
<meta http-equiv="Content-Security-Policy" 
      content="
        default-src 'self';
        script-src 'self' cdnjs.cloudflare.com;
        style-src 'self' 'unsafe-inline';
        img-src 'self' data:;
        connect-src 'none';
        frame-ancestors 'none';
        base-uri 'self';
        form-action 'none';
      ">
```

**Key Directives**:
- `default-src 'self'` - Only load from same origin
- `script-src` - Restrict JavaScript sources
- `frame-ancestors 'none'` - Prevent clickjacking
- `base-uri 'self'` - Prevent base tag injection

**Reputable Sources**:
- [MDN: Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CSP Evaluator by Google](https://csp-evaluator.withgoogle.com/)
- [OWASP: Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html)
- [W3C: CSP Level 3 Specification](https://www.w3.org/TR/CSP3/)

---

## Additional Resources

### Security Frameworks and Standards

**OWASP (Open Web Application Security Project)**
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)

**NIST (National Institute of Standards and Technology)**
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [NIST Special Publications (800 series)](https://csrc.nist.gov/publications/sp800)

**Mozilla Developer Network**
- [MDN Web Security](https://developer.mozilla.org/en-US/docs/Web/Security)
- [MDN HTTP Security](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)

### Cryptography Resources

- [Crypto101 - Free Cryptography Course](https://www.crypto101.io/)
- [Practical Cryptography for Developers](https://cryptobook.nakov.com/)
- [Stanford: Cryptography Course](https://crypto.stanford.edu/~dabo/courses/OnlineCrypto/)

### Security Testing Tools

- [OWASP ZAP (Zed Attack Proxy)](https://www.zaproxy.org/)
- [Burp Suite Community Edition](https://portswigger.net/burp/communitydownload)
- [Google Chrome DevTools Security Panel](https://developer.chrome.com/docs/devtools/security/)

### JavaScript Security

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [JavaScript: The Definitive Guide (Security Chapter)](https://www.oreilly.com/library/view/javascript-the-definitive/9781491952016/)
- [Snyk: JavaScript Security Best Practices](https://snyk.io/learn/javascript-security/)

---

## Security Checklist

Before deploying your URL-based game, verify:

- [ ] All user input is validated and sanitized
- [ ] HMAC verification occurs before any processing
- [ ] No use of `innerHTML`, `eval()`, or `Function()` with URL data
- [ ] URL length limits enforced (< 3000 characters)
- [ ] Move count limits enforced
- [ ] All moves replayed and validated
- [ ] Constant-time comparison for HMAC verification
- [ ] Turn numbers are monotonically increasing
- [ ] Timestamps validated (not too old)
- [ ] Content Security Policy implemented
- [ ] Local storage used only for history tracking
- [ ] Error messages don't leak security details
- [ ] Shared secret has sufficient entropy (128+ bits)
- [ ] Web Crypto API used (not deprecated methods)
- [ ] Game state structure validated before use
- [ ] Timeout mechanisms for long operations
- [ ] User-friendly error handling implemented

---

## Conclusion

Security in URL-based games requires defense-in-depth: multiple layers of validation, sanitization, and verification. While perfect security is impossible in a purely client-side system, following these practices significantly raises the bar for attackers.

**Remember**: The goal isn't to make cheating impossible (it's not in a client-controlled system), but to:
1. Prevent malicious code execution (XSS)
2. Detect tampering (HMAC)
3. Ensure valid game states (move validation)
4. Provide good user experience even when under attack

For casual gaming, this approach works well. For competitive play requiring strong anti-cheat, consider adding a lightweight validation server or using blockchain-based verification.
