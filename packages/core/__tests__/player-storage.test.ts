import { describe, it, expect, beforeEach } from 'vitest';
import { PlayerStorage } from '../src/lib/player-storage';

describe('PlayerStorage', () => {
  let storage: PlayerStorage;

  beforeEach(() => {
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

  it('should sanitize player name to prevent XSS', () => {
    storage.setPlayerName('<script>alert("xss")</script>');
    const name = storage.getPlayerName();
    expect(name).not.toContain('<script>');
    expect(name).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;');
  });

  it('should throw error when player name is empty', () => {
    expect(() => storage.setPlayerName('')).toThrow('Player name cannot be empty');
  });

  it('should throw error when player name is only whitespace', () => {
    expect(() => storage.setPlayerName('   ')).toThrow('Player name cannot be empty');
  });

  it('should persist player name across instances', () => {
    storage.setPlayerName('Alice');

    const newStorage = new PlayerStorage();
    const name = newStorage.getPlayerName();

    expect(name).toBe('Alice');
  });

  it('should update existing player name', () => {
    storage.setPlayerName('Alice');
    storage.setPlayerName('Bob');
    const name = storage.getPlayerName();
    expect(name).toBe('Bob');
  });
});
