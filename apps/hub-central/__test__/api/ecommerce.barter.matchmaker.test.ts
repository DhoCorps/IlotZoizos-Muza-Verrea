import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/ecommerce/barter/matchmaker/route';
import { getNeo4jSession } from '@ilot/infrastructure';
import { NextResponse } from 'next/server';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', () => ({
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) {
      return NextResponse.json({ error: "Oiseau non identifié." }, { status: 401 });
    }
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn(),
}));

declare global {
  var __mockUser: any;
}

describe('API Matchmaker Harmonique', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });

  it('🔴 [GET] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete (global as any).__mockUser;

    const req = new Request('http://localhost/api/matchmaker');
    const res = await GET(req as any, {});

    expect(res.status).toBe(401);
  });

  it('🟢 [GET] doit retourner les correspondances de troc (matches) avec succès (200)', async () => {
    global.__mockUser = { uid: 'bird_1', capabilities: [] };

    const mockSession = {
      run: vi.fn().mockResolvedValue({
        records: [
          {
            get: (key: string) => {
              if (key === 'matchUid') return 'bird_2';
              if (key === 'matchPseudo') return 'Mage Sylvestre';
              if (key === 'itemsTheyHaveThatYouWant') return ['prod_1'];
              if (key === 'itemsYouHaveThatTheyWant') return ['prod_2'];
              return null;
            }
          }
        ]
      }),
      close: vi.fn().mockResolvedValue(true),
    };

    vi.mocked(getNeo4jSession).mockReturnValue(mockSession as any);

    const req = new Request('http://localhost/api/matchmaker');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.matches).toHaveLength(1);
    expect(json.matches[0].matchUid).toBe('bird_2');
    expect(json.matches[0].itemsTheyHaveThatYouWant).toContain('prod_1');
    expect(mockSession.close).toHaveBeenCalled();
  });
});