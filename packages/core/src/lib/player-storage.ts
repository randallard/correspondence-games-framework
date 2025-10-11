/**
 * @fileoverview Player storage for managing player names in localStorage with XSS protection
 * @module correspondence-games-core/player-storage
 */

const STORAGE_KEY = 'correspondence-games:player-name';

/**
 * Manages player name storage in localStorage with validation and XSS protection.
 *
 * Provides secure storage and retrieval of player names with automatic
 * HTML entity encoding to prevent XSS attacks. Player names are validated
 * to ensure they are not empty or whitespace-only.
 *
 * @example
 * ```typescript
 * const storage = new PlayerStorage();
 *
 * // Store a player name
 * storage.setPlayerName('Alice');
 *
 * // Retrieve the player name
 * const name = storage.getPlayerName(); // 'Alice'
 *
 * // XSS attempts are sanitized
 * storage.setPlayerName('<script>alert("xss")</script>');
 * const sanitized = storage.getPlayerName();
 * // Returns: '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
 * ```
 */
export class PlayerStorage {
  /**
   * Retrieves the stored player name from localStorage.
   *
   * @returns The stored player name with HTML entities encoded, or null if not set
   *
   * @example
   * ```typescript
   * const storage = new PlayerStorage();
   * const name = storage.getPlayerName(); // null (no name stored)
   *
   * storage.setPlayerName('Bob');
   * const name = storage.getPlayerName(); // 'Bob'
   * ```
   */
  getPlayerName(): string | null {
    return localStorage.getItem(STORAGE_KEY);
  }

  /**
   * Stores the player name in localStorage with validation and sanitization.
   *
   * The name is validated to ensure it's not empty or whitespace-only,
   * then sanitized to prevent XSS attacks before being stored.
   *
   * @param name - The player name to store (must not be empty or whitespace-only)
   * @throws {Error} If name is empty or contains only whitespace
   *
   * @example
   * ```typescript
   * const storage = new PlayerStorage();
   *
   * // Valid name
   * storage.setPlayerName('Alice'); // Success
   *
   * // Invalid names throw errors
   * storage.setPlayerName('');      // Error: Player name cannot be empty
   * storage.setPlayerName('   ');   // Error: Player name cannot be empty
   * ```
   */
  setPlayerName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Player name cannot be empty');
    }
    console.log('🔴 PlayerStorage.setPlayerName() called with:', name);
    console.trace('Call stack:');
    const sanitized = this.sanitize(name);
    localStorage.setItem(STORAGE_KEY, sanitized);
    console.log('🔴 Set localStorage key:', STORAGE_KEY, 'to:', sanitized);
  }

  /**
   * Sanitizes a string to prevent XSS attacks by encoding HTML entities.
   *
   * Replaces dangerous characters with their HTML entity equivalents:
   * - & becomes &amp;
   * - < becomes &lt;
   * - > becomes &gt;
   * - " becomes &quot;
   * - ' becomes &#x27;
   * - / becomes &#x2F;
   *
   * @param str - The string to sanitize
   * @returns The sanitized string safe for display in HTML
   * @private
   */
  private sanitize(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
