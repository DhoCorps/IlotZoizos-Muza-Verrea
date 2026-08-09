// apps/hub-central/app/api/canopy/__tests__/stats.route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/canopy/stats/route';
import { MessageModel } from '@ilot/infrastructure';

// 1. Mock du modèle MessageModel pour éviter les requêtes réseau réelles
vi.mock('@ilot/infrastructure', () => ({
  MessageModel: {
    findOne: vi.fn(),
  },
}));

describe('GET /api/canopy/stats - Route API du Bilan de la Canopée', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit retourner les statistiques globales et le snapshot de la canopée avec succès (200)', async () => {
    const mockBroadcast = {
      createdAt: new Date('2026-08-01T03:00:00Z'),
      metadata: {
        statsSnapshot: {
          yearMonth: '2026-07',
          macroTotals: { totalVolumeCents: 25000, transactionCount: 12 },
          topSellers: [{ _id: 'seller_1', totalVolumeCents: 15000 }],
          topBuyers: [{ _id: 'buyer_1', totalSpentCents: 8000 }],
          mostCommented: [{ _id: 'echo_1', commentCount: 30 }],
          mostReactive: [{ _id: 'reactive_1', reactionCount: 45 }],
        },
      },
    };

    // Simulation de la chaîne Mongoose : findOne().sort().lean()
    vi.mocked(MessageModel.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(mockBroadcast),
      }),
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.yearMonth).toBe('2026-07');
    expect(data.macroTotals.totalVolumeCents).toBe(25000);
    expect(data.topSellers).toHaveLength(1);
  });

  it('doit retourner une erreur 404 si aucun bilan de la canopée n\'est trouvé en base', async () => {
    vi.mocked(MessageModel.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValueOnce(null),
      }),
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.success).toBe(false);
    expect(data.message).toContain('Aucun bilan de la canopée disponible');
  });

  it('doit retourner une erreur 500 en cas de défaillance interne du serveur', async () => {
    vi.mocked(MessageModel.findOne).mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockRejectedValueOnce(new Error('Erreur Silice MongoDB')),
      }),
    } as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.success).toBe(false);
    expect(data.error).toBe('Erreur Silice MongoDB');
  });
});