import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '../../app/api/ecommerce/products/[slug]/route';
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
  ProductModel: {
    findOne: (...args: any[]) => mockFindOne(...args),
    deleteOne: (...args: any[]) => mockDeleteOne(...args)
  }
}));

describe('API Ecommerce - Product par Slug (GET / DELETE /api/ecommerce/products/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit retourner l’artefact si trouvé', async () => {
    mockLean.mockResolvedValueOnce({ uid: 'prod_1', title: 'Police Cyber' });

    const req = new Request('http://localhost:3000/api/ecommerce/products/police-cyber');
    const res = await GET(req, { params: Promise.resolve({ slug: 'police-cyber' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uid).toBe('prod_1');
  });

  it('❌ DELETE : doit rejeter si l’oiseau n’est pas authentifié (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/products/police-cyber', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'police-cyber' }) });

    expect(res.status).toBe(401);
  });

  it('✅ DELETE : doit supprimer l’artefact avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_creator', capabilities: [] }
    } as any);

    // Pour le DELETE, la route appelle findOne sans .lean()
    vi.mocked(mockFindOne).mockResolvedValueOnce({ uid: 'prod_1', title: 'Police Cyber' });

    const req = new Request('http://localhost:3000/api/ecommerce/products/police-cyber', {
      method: 'DELETE'
    });
    const res = await DELETE(req, { params: Promise.resolve({ slug: 'police-cyber' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockDeleteOne).toHaveBeenCalled();
  });
});