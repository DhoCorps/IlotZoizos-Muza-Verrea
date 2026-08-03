// apps/hub-central/__test__/api/ecommerce.marketplace.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../../app/api/ecommerce/marketPlace/route';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    // 🪡 Simulation du chaînage .find(query).sort().lean() utilisé dans la route marketplace
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue([
          { 
            uid: 'prod_1', 
            title: 'Artefact Cosmique', 
            category: 'FONT_SPRITE', 
            style: 'Cyberpunk', 
            author: 'Albatros',
            priceCents: 1500,
            currency: 'EUR'
          }
        ])
      })
    })
  }
}));

describe('🛍️ E-commerce Marketplace API (/api/ecommerce/marketPlace)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('🟢 doit recenser et filtrer les artefacts du marketplace avec succès (GET avec query params)', async () => {
    const req = new Request('http://localhost/api/ecommerce/marketPlace?category=FONT_SPRITE&style=Cyberpunk&author=Albatros');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
    expect(data.data[0].title).toBe('Artefact Cosmique');
    expect(data.data[0].style).toBe('Cyberpunk');
  });

  it('🟢 doit gérer une requête sans filtre (valeur par défaut ALL)', async () => {
    const req = new Request('http://localhost/api/ecommerce/marketPlace');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.length).toBeGreaterThan(0);
  });
});