import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '../../app/api/ecommerce/orders/[slug]/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

const mockLean = vi.fn();
const mockFindOne = vi.fn().mockImplementation(() => ({
  lean: mockLean
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OrderModel: {
    findOne: (...args: any[]) => mockFindOne(...args)
  }
}));

describe('API Ecommerce - Order par Slug (GET / PATCH /api/ecommerce/orders/[slug])', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ GET : doit rejeter si l’oiseau n’est pas connecté (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/orders/ord_123');
    const res = await GET(req, { params: Promise.resolve({ slug: 'ord_123' }) });

    expect(res.status).toBe(401);
  });

  it('✅ GET : doit retourner la commande si l’acheteur est le propriétaire (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_buyer', capabilities: [] }
    } as any);

    mockLean.mockResolvedValueOnce({
      uid: 'ord_123',
      buyerUid: 'bird_buyer',
      totalAmount: 100
    });

    const req = new Request('http://localhost:3000/api/ecommerce/orders/ord_123');
    const res = await GET(req, { params: Promise.resolve({ slug: 'ord_123' }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.uid).toBe('ord_123');
  });

  it('❌ GET : doit refuser l’accès si l’oiseau n’est ni l’acheteur ni admin (403)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_stranger', capabilities: [] }
    } as any);

    mockLean.mockResolvedValueOnce({
      uid: 'ord_123',
      buyerUid: 'bird_buyer',
      totalAmount: 100
    });

    const req = new Request('http://localhost:3000/api/ecommerce/orders/ord_123');
    const res = await GET(req, { params: Promise.resolve({ slug: 'ord_123' }) });

    expect(res.status).toBe(403);
  });
});