// apps/hub-central/__test__/api/ecommerce.marketplace.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/ecommerce/marketPlace/route';

// ==========================================
// MOCKS DU SANCTUAIRE (Gérés via vi.hoisted)
// ==========================================
const { mockConnectToDatabase, mockLean } = vi.hoisted(() => ({
  mockConnectToDatabase: vi.fn().mockResolvedValue(true),
  mockLean: vi.fn()
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: mockConnectToDatabase,
  ProductModel: {
    find: vi.fn().mockImplementation(() => ({
      sort: vi.fn().mockImplementation(() => ({
        lean: mockLean
      }))
    }))
  }
}));

describe('API Ecommerce - Marketplace (GET /api/ecommerce/marketPlace)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConnectToDatabase.mockResolvedValue(true);
  });

  it('✅ doit recenser tous les produits si aucun filtre n’est appliqué', async () => {
    mockLean.mockResolvedValueOnce([
      { uid: 'prod_1', title: 'Police Cyberpunk', category: 'FONT_SPRITE', ownerUid: 'bird_1' },
      { uid: 'prod_2', title: 'Partition Fretless', category: 'MUSIC', ownerUid: 'bird_2' }
    ]);

    const req = new Request('http://localhost:3000/api/ecommerce/marketPlace');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.length).toBe(2);
    // Vérification que l'enrichissement authorSlug a bien fonctionné
    expect(data.data[0].authorSlug).toBe('bird_1');
  });

  it('✅ doit filtrer les produits selon la catégorie demandée', async () => {
    mockLean.mockResolvedValueOnce([
      { uid: 'prod_1', title: 'Police Cyberpunk', category: 'FONT_SPRITE' }
    ]);

    const req = new Request('http://localhost:3000/api/ecommerce/marketPlace?category=FONT_SPRITE');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data[0].category).toBe('FONT_SPRITE');
  });

  it('🔥 doit gérer une panne de la Silice avec élégance (500)', async () => {
    mockConnectToDatabase.mockRejectedValueOnce(new Error('Erreur base de données'));

    const req = new Request('http://localhost:3000/api/ecommerce/marketPlace');
    const res = await GET(req as any);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});