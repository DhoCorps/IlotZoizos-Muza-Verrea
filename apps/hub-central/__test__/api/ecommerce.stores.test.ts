import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  StoreModel: {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockResolvedValue([
        { uid: 'store-1', storeName: 'Boutique des Artefacts', slug: 'boutique-des-artefacts', ownerUid: 'bird-alpha', isVerified: true }
      ])
    }),
    findOne: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock_id' }))
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { uid: 'bird-alpha', name: 'Albatros', capabilities: ['*'] }
  })
}));

import { GET, POST } from '../../app/api/ecommerce/stores/route';

describe('API Ecommerce Stores (/api/ecommerce/stores)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser toutes les boutiques vérifiées (GET)', async () => {
    const res = await GET();
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].storeName).toBe('Boutique des Artefacts');
  });

  it('🟢 doit sceller une nouvelle boutique dans la matrice (POST)', async () => {
    const req = new Request('http://localhost/api/ecommerce/stores', {
      method: 'POST',
      body: JSON.stringify({
        storeName: 'Le Comptoir de l’Oiseau',
        description: 'Vente de polices et parchemins'
      })
    });
    const res = await POST(req);
    const data = await res.json();
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.storeName).toBe('Le Comptoir de l’Oiseau');
    expect(data.data.slug).toBe('le-comptoir-de-loiseau'); // 🪡 Slug normalisé sans caractères spéciaux
  });
});