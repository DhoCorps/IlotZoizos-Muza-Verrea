import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, PATCH } from '../../app/api/ecommerce/barter/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockFind = vi.fn();
const mockCreate = vi.fn();
const mockFindOneAndUpdate = vi.fn();

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  BarterOfferModel: {
    find: (...args: any[]) => ({
      sort: () => ({
        lean: () => mockFind(...args)
      })
    }),
    create: (...args: any[]) => mockCreate(...args),
    findOneAndUpdate: (...args: any[]) => mockFindOneAndUpdate(...args)
  }
}));

const mockProposeBarter = vi.fn();
const mockResolveBarter = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  EcommerceOrchestrator: vi.fn().mockImplementation(() => ({
    proposeBarter: (...args: any[]) => mockProposeBarter(...args),
    resolveBarter: (...args: any[]) => mockResolveBarter(...args)
  }))
}));

describe('API Ecommerce - Barter Principal (GET / POST / PATCH /api/ecommerce/barter)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ GET : doit lister les offres de troc en attente (PENDING)', async () => {
    mockFind.mockResolvedValueOnce([{ uid: 'barter_1', status: 'PENDING' }]);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.length).toBe(1);
  });

  it('❌ POST : doit rejeter si l’oiseau n’est pas authentifié (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/barter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverUid: 'rec_1' })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('✅ POST : doit créer une proposition de troc avec succès (201)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'oiseau-initiator-1', capabilities: [] }
    } as any);

    mockCreate.mockResolvedValueOnce({ uid: 'barter_new', status: 'PENDING' });
    mockProposeBarter.mockResolvedValueOnce(true);

    const req = new Request('http://localhost:3000/api/ecommerce/barter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverUid: 'rec_1', offeredProductUids: ['p1'], requestedProductUids: ['p2'] })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(mockCreate).toHaveBeenCalled();
    expect(mockProposeBarter).toHaveBeenCalled();
  });

  it('✅ PATCH : doit mettre à jour le statut du troc (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'oiseau-acceptor-1', capabilities: [] }
    } as any);

    mockFindOneAndUpdate.mockResolvedValueOnce({ uid: 'barter_1', status: 'ACCEPTED' });
    mockResolveBarter.mockResolvedValueOnce(true);

    const req = new Request('http://localhost:3000/api/ecommerce/barter', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barterUid: 'barter_1', status: 'ACCEPTED' })
    });

    const res = await PATCH(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(mockFindOneAndUpdate).toHaveBeenCalled();
  });
});