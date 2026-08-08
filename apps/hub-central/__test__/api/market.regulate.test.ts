// apps/hub-central/__test__/api/market.regulation.evaluate.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/market/regulate/route';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn(),
}));

import { getServerSession } from 'next-auth/next';

describe('API Market Regulation - Régulation de l’Îlot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter les requêtes non authentifiées', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);

    const req = new Request('http://localhost/api/ecommerce/market/regulate', {
      method: 'POST',
      body: JSON.stringify({ userIdentifier: 'bird-test', takeValue: 5 })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });
});