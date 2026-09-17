import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/ecommerce/barter/matchmaker/route';
import { getNeo4jSession } from '@ilot/infrastructure';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, ctx: ApiContext) => {
      const mockUser = global.__mockUser;
      if (!mockUser || !mockUser.uid) {
        return NextResponse.json({ success: false, error: "Oiseau non identifié." }, { status: 401 });
      }
      // @ts-ignore
      return await handler(req, ctx, mockUser);
    },
  };
});

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  getNeo4jSession: vi.fn(),
}));

declare global {
  // 🛡️ Signature globale harmonisée avec le reste du projet
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Matchmaker Harmonique', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('🔴 [GET] doit refuser l\'accès (401) si l\'oiseau n\'est pas authentifié', async () => {
    delete global.__mockUser;

    const req = new NextRequest('http://localhost/api/matchmaker');
    const res = await getHandler(req, {} as ApiContext);

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

    vi.mocked(getNeo4jSession).mockReturnValue(mockSession as unknown as ReturnType<typeof getNeo4jSession>);

    const req = new NextRequest('http://localhost/api/matchmaker');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; matches: Array<{ matchUid: string; itemsTheyHaveThatYouWant: string[] }> };

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.matches).toHaveLength(1);
    expect(json.matches[0].matchUid).toBe('bird_2');
    expect(json.matches[0].itemsTheyHaveThatYouWant).toContain('prod_1');
    expect(mockSession.close).toHaveBeenCalled();
  });
});