import { describe, it, expect } from 'vitest';
import { IBettorResult } from '@ilot/types';

describe('Betting Types - Barter', () => {
  it('🟢 doit supporter des mises complexes (mix assets) avec des montants en centimes', () => {
    const bet: IBettorResult = {
      userId: 'bird_1',
      gameId: 'crazymorpion',
      betAssets: [{ type: 'SAMPLE', amount: 1, entityId: 'sample_01' }], // 1 entité unique (échantillon/tâche)
      winnings: [
        { type: 'KAOS', amountCents: 10000 }, // 100 Kaos en centimes
        { type: 'EURO', amountCents: 200 }    // 2.00 € en centimes
      ],
      multiplier: 1.5,
      status: 'PENDING',
      timestamp: new Date()
    };
    expect(bet.winnings.length).toBe(2);
    expect(bet.winnings[1].amountCents).toBe(200);
  });
});