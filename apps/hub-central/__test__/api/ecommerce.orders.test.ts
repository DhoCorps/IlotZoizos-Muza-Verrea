import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/ecommerce/orders/route';

const mockCreate = vi.fn();
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  OrderModel: {
    create: (...args: any[]) => mockCreate(...args)
  }
}));

describe('API Ecommerce - Orders Principal (POST /api/ecommerce/orders)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('✅ doit créer une commande avec succès et retourner 201', async () => {
    mockCreate.mockResolvedValueOnce({
      uid: 'ord_123',
      buyerUid: 'bird_1',
      totalAmount: 50,
      currency: 'EUR',
      status: 'PAID'
    });

    const req = new Request('http://localhost:3000/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ buyerUid: 'bird_1', items: [], totalAmount: 50 })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.uid).toBe('ord_123');
  });

  it('🔥 doit gérer un échec de création avec élégance (500)', async () => {
    mockCreate.mockRejectedValueOnce(new Error('Erreur base de données'));

    const req = new Request('http://localhost:3000/api/ecommerce/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ totalAmount: 50 })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error).toBeDefined();
  });
});