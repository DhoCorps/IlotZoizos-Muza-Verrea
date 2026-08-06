import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '../../app/api/ecommerce/stores/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockLean = vi.fn();
const mockFindOne = vi.fn().mockImplementation(() => ({
  lean: mockLean
}));
const mockDeleteOne = vi.fn().mockResolvedValue(true);

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  StoreModel: {
    findOne: (...args: any[]) => mockFindOne(...args),
    deleteOne: (...args: any[]) => mockDeleteOne(...args)
  }
}));

describe('API Ecommerce - Store par Slug (GET / DELETE /api/ecommerce/stores/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit retourner la boutique si trouvée', async () => {
    mockLean.mockResolvedValueOnce({ uid: 'store_1', storeName: 'Boutique Magique' });

    const req = new Request('http://localhost:3000/api/ecommerce/stores/boutique-magique');
    const res = await GET(req, { params: Promise.resolve({ slug: 'boutique-magique' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uid).toBe('store_1');
  });

  it('❌ DELETE : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/stores/boutique-magique', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'boutique-magique' }) });

    expect(res.status).toBe(401);
  });

  it('✅ DELETE : doit dissoudre la boutique avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_owner', capabilities: [] }
    } as any);

    vi.mocked(mockFindOne).mockResolvedValueOnce({ uid: 'store_1', storeName: 'Boutique Magique' });

    const req = new Request('http://localhost:3000/api/ecommerce/stores/boutique-magique', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'boutique-magique' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteOne).toHaveBeenCalled();
  });
});