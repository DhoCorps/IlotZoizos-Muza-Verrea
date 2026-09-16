import { describe, it, expect, vi, beforeEach } from 'vitest';
import { UniversHallPantheonOrchestrator } from '../univershallPantheon.orchestrator';
import { OiseauModel, LedgerEntryModel } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    OiseauModel: {
      find: vi.fn(),
    },
    LedgerEntryModel: {
      aggregate: vi.fn(),
    },
  };
});

describe('UniversHallPantheonOrchestrator - Le Panthéon des Résonances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit retourner un tableau vide si aucun oiseau n\'est trouvé dans la Silice', async () => {
    vi.mocked(OiseauModel.find).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([])
    } as any);

    const result = await UniversHallPantheonOrchestrator.calculatePantheon();
    expect(result).toEqual([]);
  });

  it('doit calculer l\'indice de résonance, croiser les éloges et le grand livre, puis trier le Panthéon', async () => {
    // 1. Simulation des oiseaux
    vi.mocked(OiseauModel.find).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { uid: 'bird_1', pseudo: 'Poète Silencieux', praisesCount: 2 },
        { uid: 'bird_2', pseudo: 'Mécène Lumineux', praisesCount: 8 }
      ])
    } as any);

    // 2. Simulation des flux financiers (KomptaStats) en centimes
    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValue([
      { _id: 'bird_1', totalVolume: 100000 }, // 1000 EUR -> 1000 * 0.4 = 400 points
      { _id: 'bird_2', totalVolume: 10000 }   // 100 EUR -> 100 * 0.4 = 40 points
    ]);

    const pantheon = await UniversHallPantheonOrchestrator.calculatePantheon('2026-08');

    expect(pantheon).toHaveLength(2);
    // bird_1 : (1000 * 0.4) + (2 * 15) + (5 * 10) = 400 + 30 + 50 = 480
    // bird_2 : (100 * 0.4) + (8 * 15) + (5 * 10) = 40 + 120 + 50 = 210
    // Le Poète passe donc devant grâce à sa puissance financière combinée !
    expect(pantheon[0].uid).toBe('bird_1');
    expect(pantheon[0].resonanceScore).toBe(480);
    expect(pantheon[1].uid).toBe('bird_2');
    expect(pantheon[1].resonanceScore).toBe(210);
  });
});