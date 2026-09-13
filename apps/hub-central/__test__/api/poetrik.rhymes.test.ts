// app/api/poetrik/rhymes/__tests__/route.test.ts

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/poetrik/rhymes/route';
import { getNeo4jSession } from '@ilot/infrastructure';

// 1. On mocke l'infrastructure en exportant aussi connectToDatabase pour satisfaire api-guards
vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn(),
  connectToDatabase: vi.fn().mockResolvedValue(true),
}));

vi.mock('@lib/api-guards', () => ({
  withOptionalAura: (handler: any) => handler,
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

  it('doit rejeter (400) si ni uid ni word ne sont fournis', async () => {
    const req = new Request('http://localhost/api/poetrik/rhymes');
    const res = await GET(req as any, {} as any);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toContain('identifiant (uid) ou un mot (word) est requis');
  });

  it('doit retourner les rimes trouvées dans le graphe Neo4j', async () => {
    mockNeoSession.run.mockResolvedValueOnce({
      records: [
        {
          get: (field: string) => {
            if (field === 'uid') return 'lex_fr_roseau';
            if (field === 'word') return 'roseau';
            if (field === 'languageCode') return 'fr';
            if (field === 'phoneticIpa') return '/ʁo.zo/';
            if (field === 'syllableCount') return 2;
            if (field === 'rhymeType') return 'rich';
            if (field === 'matchScore') return 'zo';
            return null;
          }
        }
      ]
    });

    const req = new Request('http://localhost/api/poetrik/rhymes?word=oiseau');
    const res = await GET(req as any, {} as any);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data).toHaveLength(1);
    expect(json.data[0].word).toBe('roseau');
    expect(json.data[0].phoneticIpa).toBe('/ʁo.zo/');
    expect(mockNeoSession.run).toHaveBeenCalledTimes(1);
  });
});