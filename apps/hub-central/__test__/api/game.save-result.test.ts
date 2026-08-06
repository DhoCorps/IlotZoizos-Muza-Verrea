// apps/hub-central/__test__/api/game.save-result.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/games/save-result/route';
import { getServerSession } from 'next-auth';
import { GameResultModel } from '@ilot/infrastructure';

// 1. On isole le mock de la méthode create du modèle
const { mockCreate } = vi.hoisted(() => ({
  mockCreate: vi.fn(),
}));

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// 2. On intercepte directement le package partagé pour couper l'accès à MongoDB
vi.mock('@ilot/infrastructure', () => ({
  GameResultModel: {
    create: mockCreate,
  },
}));

describe('POST /api/games/save-result', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('devrait retourner 401 si non authentifié', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null);
    const req = new Request('http://test', { method: 'POST', body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('devrait enregistrer le résultat', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({ user: { name: 'Oiseau' } } as any);
    mockCreate.mockResolvedValueOnce({ _id: '123' });

    const req = new Request('http://test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameType: 'Wiki', score: 100 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(mockCreate).toHaveBeenCalled();
  });
});