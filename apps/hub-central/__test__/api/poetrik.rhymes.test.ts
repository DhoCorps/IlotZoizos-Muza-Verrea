// apps/hub-central/__test__/api/poetrik.rhymes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/poetrik/rhymes/route';
import { getNeo4jSession } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';

vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn(),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/api-guards', () => ({
  withOptionalAura: (handler: any) => async (req: any, ctx: any) => handler(req, ctx, { uid: 'guest' }),
  handleRouteError: (err: any) => new Response(JSON.stringify({ error: err.message }), { status: 500 })
}));

describe('API Route /api/poetrik/rhymes', () => {
  let mockNeoSession: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockNeoSession = {
      run: vi.fn(),
      close: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(getNeo4jSession).mockReturnValue(mockNeoSession);
  });

  it('🔴 doit rejeter (400) si ni uid ni word ne sont fournis', async () => {
    const req = new NextRequest('http://localhost/api/poetrik/rhymes');
    const res = await GET(req, { params: {} });
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('identifiant (uid) ou un mot (word) est requis');
  });

  it('🟢 doit retourner les rimes trouvées dans le graphe Neo4j', async () => {
    // Mock précis du retour d'un "Record" Neo4j
    mockNeoSession.run.mockResolvedValueOnce({
      records: [
        {
          get: (field: string) => {
            const data: Record<string, any> = {
              uid: 'lex_fr_roseau',
              word: 'roseau',
              languageCode: 'fr',
              phoneticIpa: '/ʁo.zo/',
              syllableCount: 2,
              rhymeType: 'rich',
              matchScore: 'zo'
            };
            return data[field];
          }
        }
      ]
    });

    const req = new NextRequest('http://localhost/api/poetrik/rhymes?word=oiseau');
    const res = await GET(req, { params: {} });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].word).toBe('roseau');
    expect(json.data[0].phoneticIpa).toBe('/ʁo.zo/');
    expect(mockNeoSession.run).toHaveBeenCalledTimes(1);
  });
});