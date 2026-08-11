import { describe, it, expect } from 'vitest';
import { IBettorResult } from '@ilot/types';

describe('Betting Types - Barter', () => {
  it('🟢 doit supporter des mises complexes (mix assets)', () => {
    const bet: IBettorResult = {
      userId: 'bird_1',
      gameId: 'crazymorpion',
      betAssets: [{ type: 'SAMPLE', amount: 1, entityId: 'sample_01' }],
      winnings: [{ type: 'KAOS', amount: 100 }, { type: 'EURO', amount: 2 }],
      multiplier: 1.5,
      status: 'PENDING',
      timestamp: new Date()
    };
    expect(bet.winnings.length).toBe(2);
  });
});