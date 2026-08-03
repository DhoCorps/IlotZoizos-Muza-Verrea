// __tests__/ecommerce-stores.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getStores, POST as createStore } from '../../app/api/ecommerce/stores/route';
import { GET as getStoreBySlug, DELETE as deleteStore } from '../../app/api/ecommerce/stores/[slug]/route';
import { StoreModel, connectToDatabase } from '@ilot/infrastructure';
import { getServerSession } from 'next-auth/next';

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn(),
  StoreModel: {
    find: vi.fn(),
    findOne: vi.fn(),
    create: vi.fn(),
    deleteOne: vi.fn(),
  }
}));

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

describe('🏛️ E-commerce Stores API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit recenser les boutiques vérifiées', async () => {
    const mockStores = [{ uid: 'store_1', storeName: 'Boutique de l’Îlot' }];
    (StoreModel.find as any).mockReturnValue({
      sort: () => Promise.resolve(mockStores)
    });

    const res = await getStores();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual(mockStores);
  });

  it('doit rejeter la création de boutique si non connecté', async () => {
    (getServerSession as any).mockResolvedValue(null);

    const req = new Request('http://localhost/api/ecommerce/stores', {
      method: 'POST',
      body: JSON.stringify({ storeName: 'Mon Échoppe' })
    });

    const res = await createStore(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain("Création de boutique refusée");
  });
});