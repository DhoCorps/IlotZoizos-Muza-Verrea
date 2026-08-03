// apps/hub-central/__test__/api/ecommerce.products.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    // 🪡 Correction du chaînage .find().sort().lean() attendu par la route
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { uid: 'prod-1', storeUid: 'store-1', title: 'Police LetrIn', slug: 'police-letrin', priceCents: 1500, category: 'FONT_SPRITE' }
        ])
      })
    }),
    findOne: vi.fn().mockResolvedValue(null), // Nécessaire pour la vérification d'unicité du slug
    create: vi.fn().mockImplementation((data) => Promise.resolve({ ...data, _id: 'mock_id' }))
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { uid: 'bird-alpha', name: 'Albatros', capabilities: ['*'] }
  })
}));

import { GET, POST } from '../../app/api/ecommerce/products/route';

describe('API Ecommerce Products (/api/ecommerce/products)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser tous les artefacts du catalogue (GET)', async () => {
    const req = new Request('http://localhost/api/ecommerce/products');
    const res = await GET(req);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data[0].title).toBe('Police LetrIn');
  });

  it('🟢 doit ajouter un nouvel artefact dans la boutique (POST)', async () => {
    const req = new Request('http://localhost/api/ecommerce/products', {
      method: 'POST',
      body: JSON.stringify({
        storeUid: 'store-1',
        title: 'Parchemin Cyberpunk',
        description: 'Un grimoire de code',
        priceCents: 2500,
        category: 'LORE_SCROLL'
      })
    });
    const res = await POST(req);
    const data = await res.json();
    
    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.title).toBe('Parchemin Cyberpunk');
    expect(data.data.slug).toBe('parchemin-cyberpunk');
  });
});