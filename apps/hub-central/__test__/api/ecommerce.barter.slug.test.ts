import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '../../app/api/ecommerce/barter/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFindOne = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  BarterOfferModel: {
    findOne: (...args: any[]) => ({
      lean: () => mockFindOne(...args)
    })
  }
}));

const mockResolveBarter = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    resolveBarter: (...args: any[]) => mockResolveBarter(...args)
  }))
}));

describe('API Ecommerce - Barter par Slug (GET / PATCH /api/ecommerce/barter/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit retourner l’offre de troc si elle existe', async () => {
    mockFindOne.mockResolvedValueOnce({ uid: 'barter_123', status: 'PENDING' });

    const req = new Request('http://localhost:3000/api/ecommerce/barter/barter_123');
    const res = await GET(req, { params: Promise.resolve({ slug: 'barter_123' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uid).toBe('barter_123');
  });

  it('❌ GET : doit retourner 404 si l’offre est introuvable', async () => {
    mockFindOne.mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/barter/inconnu');
    const res = await GET(req, { params: Promise.resolve({ slug: 'inconnu' }) });

    expect(res.status).toBe(404);
  });

  it('❌ PATCH : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/barter/barter_123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACCEPTED' })
    });

    const res = await PATCH(req, { params: Promise.resolve({ slug: 'barter_123' }) });
    expect(res.status).toBe(401);
  });

  it('✅ PATCH : doit résoudre l’offre de troc avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'oiseau-acceptor-1', capabilities: [] }
    } as any);

    mockResolveBarter.mockResolvedValueOnce({ uid: 'barter_123', status: 'ACCEPTED' });

    const req = new Request('http://localhost:3000/api/ecommerce/barter/barter_123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'ACCEPTED' })
    });

    const res = await PATCH(req, { params: Promise.resolve({ slug: 'barter_123' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe('ACCEPTED');
  });
});