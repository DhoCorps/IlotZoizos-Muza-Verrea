import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/ecommerce/stores/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFind = vi.fn();
const mockFindOne = vi.fn().mockResolvedValue(null);
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  StoreModel: {
    find: (...args: any[]) => ({
      sort: () => ({
        lean: () => mockFind(...args)
      })
    }),
    findOne: (...args: any[]) => mockFindOne(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

const mockCreateStore = vi.fn().mockResolvedValue(true);
vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    createStore: (...args: any[]) => mockCreateStore(...args)
  }))
}));

vi.mock('../../../../lib/slugify', () => ({
  slugify: (str: string) => str.toLowerCase().replace(/\s+/g, '-')
}));

describe('API Ecommerce - Stores Principal (GET / POST /api/ecommerce/stores)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit lister les boutiques vérifiées', async () => {
    mockFind.mockResolvedValueOnce([{ uid: 'store_1', storeName: 'Artisanat Fretless' }]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName: 'Nouvelle Boutique' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('✅ POST : doit créer une boutique avec slug unique (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_owner', capabilities: [] }
    } as any);

    mockCreate.mockResolvedValueOnce({
      uid: 'store_new',
      storeName: 'Nouvelle Boutique',
      slug: 'nouvelle-boutique'
    });

    const req = new Request('http://localhost:3000/api/ecommerce/stores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ storeName: 'Nouvelle Boutique' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.slug).toBe('nouvelle-boutique');
    expect(mockCreate).toHaveBeenCalled();
  });
});