import { describe, it, expect } from 'vitest';
import { calculateChecksum } from '../src/lib/checksum';

describe('calculateChecksum', () => {
  it('should generate consistent SHA-256 checksum', async () => {
    const checksum1 = await calculateChecksum('🎮');
    const checksum2 = await calculateChecksum('🎮');

    expect(checksum1).toBe(checksum2);
    expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
  });

  it('should generate different checksums for different emoji chains', async () => {
    const checksum1 = await calculateChecksum('🎮');
    const checksum2 = await calculateChecksum('🎯');

    expect(checksum1).not.toBe(checksum2);
  });
});
