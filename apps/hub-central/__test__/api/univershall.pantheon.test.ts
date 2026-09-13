// apps/hub-central/__test__/api/univershall.pantheon.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/univershall/pantheon/route';
import { OiseauModel, LedgerEntryModel } from '@ilot/infrastructure';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OiseauModel: {
    find: vi.fn(),
  },
  LedgerEntryModel: {
    aggregate: vi.fn(),
  },
}));

vi.mock('@lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
}));

describe('API Route /api/univershall/pantheon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit calculer, fusionner et retourner le classement d\'élite du Panthéon avec succès', async () => {
    vi.mocked(OiseauModel.find).mockReturnValue({
      select: vi.fn().mockReturnThis(),
      lean: vi.fn().mockResolvedValue([
        { uid: 'bird_1', pseudo: 'Alchimiste', praisesCount: 10 },
        { uid: 'bird_2', pseudo: 'Mécène', praisesCount: 2 }
      ])
    } as any);

    vi.mocked(LedgerEntryModel.aggregate).mockResolvedValue([
      { _id: 'bird_1', totalVolume: 50000 }, // 500 EUR
      { _id: 'bird_2', totalVolume: 200000 } // 2000 EUR
    ]);

    const req = new Request('http://localhost/api/univershall/pantheon');
    const res = await GET(req as any, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.pantheon).toHaveLength(2);
    // L'Alchimiste a 10 éloges (10 * 15 = 150) + financier (500 * 0.4 = 200) + graphe (50) = 400
    // Le Mécène a 2 éloges (2 * 15 = 30) + financier (2000 * 0.4 = 800) + graphe (50) = 880
    // Le Mécène passe donc devant grâce au volume financier massif !
    expect(json.pantheon[0].uid).toBe('bird_2');
    expect(json.pantheon[1].uid).toBe('bird_1');
  });
});