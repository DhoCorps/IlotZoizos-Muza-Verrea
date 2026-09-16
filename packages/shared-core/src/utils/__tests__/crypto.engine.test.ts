import { describe, it, expect } from 'vitest';
import { generateFileHash } from '../crypto.engine';

describe('crypto.utils - generateFileHash', () => {
  it('should generate a consistent SHA-256 hex string for a string or buffer', () => {
    const payload = 'Muza Verrea et la Canopée';
    const hashFromString = generateFileHash(payload);
    const hashFromBuffer = generateFileHash(Buffer.from(payload, 'utf-8'));

    expect(hashFromString).toBe(hashFromBuffer);
    expect(hashFromString).toHaveLength(64); // Un SHA-256 en hexadécimal fait toujours 64 caractères
  });

  it('should throw an error when input is missing or empty', () => {
    expect(() => generateFileHash(null as unknown as Buffer)).toThrow();
    expect(() => generateFileHash(undefined as unknown as string)).toThrow();
  });
});