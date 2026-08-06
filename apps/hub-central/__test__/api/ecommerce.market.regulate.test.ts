import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/ecommerce/market/regulate/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true)
}));

const mockProcessConnectedRegulation = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  MarketRegulationOrchestrator: vi.fn().mockImplementation(() => ({
    processConnectedRegulation: (...args: any[]) => mockProcessConnectedRegulation(...args)
  }))
}));

describe('API Market Regulation - Régulation de l’Îlot (POST /api/ecommerce/market/regulate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter les requêtes des oiseaux non authentifiés (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/ecommerce/market/regulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'bird_1', takeValue: 10 })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('❌ doit rejeter si les paramètres de régulation sont manquants (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_admin', capabilities: [] }
    } as any);

    const req = new Request('http://localhost:3000/api/ecommerce/market/regulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'bird_1' }) // takeValue manquant
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('✅ doit exécuter la régulation du marché avec succès (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'bird_admin', capabilities: [] }
    } as any);

    mockProcessConnectedRegulation.mockResolvedValueOnce({ lambda: 50, status: 'STABLE' });

    const req = new Request('http://localhost:3000/api/ecommerce/market/regulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'bird_1', takeValue: 15, currentNeeds: 2, creationFactor: 1 })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.lambda).toBe(50);
    expect(mockProcessConnectedRegulation).toHaveBeenCalled();
  });
});