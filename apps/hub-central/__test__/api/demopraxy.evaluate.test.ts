import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/demopraxy/evaluate/route';
import { getServerSession } from 'next-auth/next';

vi.mock('next-auth/next', () => ({
  getServerSession: vi.fn()
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true)
}));

const mockProcessEvaluation = vi.fn();
vi.mock('@ilot/shared-core', () => ({
  DemopraxyOrchestrator: vi.fn().mockImplementation(() => ({
    processDemopraxicEvaluation: (...args: any[]) => mockProcessEvaluation(...args)
  }))
}));

describe('API Demopraxy - Évaluation du Vortex (POST /api/demopraxy/evaluate)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('❌ doit rejeter les requêtes des oiseaux non authentifiés (401)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);

    const req = new Request('http://localhost:3000/api/demopraxy/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'target-1', metrics: {} })
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('❌ doit rejeter les requêtes avec corps incomplet (400)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'actor-1', capabilities: ['ADMIN'] }
    } as any);

    const req = new Request('http://localhost:3000/api/demopraxy/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'target-1' })
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it('✅ doit évaluer la démopraxie avec succès si les données sont valides (200)', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { uid: 'actor-1', capabilities: ['ADMIN'] }
    } as any);

    mockProcessEvaluation.mockResolvedValueOnce({ score: 95, status: 'HARMONIOUS' });

    const req = new Request('http://localhost:3000/api/demopraxy/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userIdentifier: 'target-1', metrics: { noiseLevel: 5 } })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.score).toBe(95);
    expect(data.status).toBe('HARMONIOUS');
  });
});