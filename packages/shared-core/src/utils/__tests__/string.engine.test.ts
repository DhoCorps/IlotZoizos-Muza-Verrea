import { describe, it, expect } from 'vitest';
import { generateSlug } from '../string.engine';

describe('string.utils - generateSlug', () => {
  it('should convert a standard string to a valid slug', () => {
    expect(generateSlug('Hello World')).toBe('hello-world');
  });

  it('should remove accents and special characters', () => {
    expect(generateSlug("L'Îlot des OISEAUX & Zôizos!")).toBe('l-ilot-des-oiseaux-zoizos');
  });

  it('should handle extra spaces and multiple hyphens', () => {
    expect(generateSlug('   Test   --  de   slug   ')).toBe('test-de-slug');
  });

  it('should return an empty string for invalid inputs', () => {
    expect(generateSlug('')).toBe('');
    expect(generateSlug(null as unknown as string)).toBe('');
    expect(generateSlug(undefined as unknown as string)).toBe('');
  });
});