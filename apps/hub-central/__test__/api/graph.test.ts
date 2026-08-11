import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/graph/context/route'; // Assure-toi du chemin exact de ta route
import { getNeo4jSession } from '@ilot/infrastructure';

vi.mock('@/lib/api-guards', () => ({ 
  withSilice: (handler: any) => handler 
}));

vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn(),
}));

// 🧠 CORRECTION ICI : unstable_cache doit retourner la fonction callback, pas son résultat direct
vi.mock('next/cache', () => ({ 
  unstable_cache: vi.fn((cb) => cb),
  revalidateTag: vi.fn(),
}));

describe('API Graph Neo4j', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as any).__mockUser;
  });
  it('🟢 doit renvoyer les nœuds et liens formatés', async () => {
    const mockSession = {
      run: vi.fn().mockResolvedValue({
        records: [{
          get: (key: string) => {
            if (key === 'root') return { properties: { uid: '1', name: 'Root' }, labels: ['Node'] };
            if (key === 'neighbor') return { properties: { uid: '2', name: 'Neighbor' }, labels: ['Node'] };
            if (key === 'r') return { type: 'LINKED' };
            return null;
          }
        }]
      }),
      close: vi.fn(),
    };
    vi.mocked(getNeo4jSession).mockReturnValue(mockSession as any);

    const req = new Request('http://localhost/api/graph/context?uid=1');
    const res = await GET(req as any, {});
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.nodes).toHaveLength(2);
    expect(json.links[0].type).toBe('LINKED');
    expect(mockSession.close).toHaveBeenCalled();
  });
});