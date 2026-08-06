import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../../app/api/ecommerce/products/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFind = vi.fn();
const mockFindOne = vi.fn().mockResolvedValue(null);
const mockCreate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  ProductModel: {
    find: (...args: any[]) => ({
      sort: () => ({
        lean: () => mockFind(...args)
      })
    }),
    findOne: (...args: any[]) => mockFindOne(...args),
    create: (...args: any[]) => mockCreate(...args)
  }
}));

vi.mock('../../../../lib/slugify', () => ({
  slugify: (str: string) => str.toLowerCase().replace(/\s+/g, '-')
}));

describe('API Ecommerce - Products Principal (GET / POST /api/ecommerce/products)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit lister les produits', async () => {
    mockFind.mockResolvedValueOnce([{ uid: 'prod_1', title: 'Test Artefact' }]);

    const req = new Request('http://localhost:3000/api/ecommerce/products');
    const res = await GET(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouvelle Police' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('✅ POST : doit créer un produit avec slug unique (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_creator', capabilities: [] }
    } as any);

    mockCreate.mockResolvedValueOnce({
      uid: 'prod_new',
      title: 'Nouvelle Police',
      slug: 'nouvelle-police'
    });

    const req = new Request('http://localhost:3000/api/ecommerce/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nouvelle Police', category: 'FONT_SPRITE' })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.slug).toBe('nouvelle-police');
    expect(mockCreate).toHaveBeenCalled();
  });
});