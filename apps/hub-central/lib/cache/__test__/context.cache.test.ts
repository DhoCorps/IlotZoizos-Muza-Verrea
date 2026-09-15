// Fichier : __test__/cache/context.cache.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getCachedGraphData } from '@/lib/cache/context.cache';
import { getNeo4jSession } from '@ilot/infrastructure';
import { unstable_cache } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb),
}));

vi.mock('@ilot/infrastructure', () => ({
  getNeo4jSession: vi.fn(),
}));

describe('Cache : getCachedGraphData (Graphe Neo4j)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it('doit exécuter directement le fetcher, formatter les nœuds/liens et nettoyer la session en test', async () => {
    const mockRecord = {
      get: vi.fn((key) => {
        if (key === 'root') return { properties: { uid: 'u1', name: 'Root Node' }, labels: ['Oiseau'] };
        if (key === 'neighbor') return { properties: { uid: 'u2', title: 'Neighbor Node' }, labels: ['Product'] };
        if (key === 'r') return { type: 'OWNS' };
        return null;
      }),
    };

    const mockRun = vi.fn().mockResolvedValue({ records: [mockRecord] });
    const mockClose = vi.fn().mockResolvedValue(true);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: mockRun,
      close: mockClose,
    } as any);

    const result = await getCachedGraphData('u1');

    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0]).toMatchObject({ id: 'u1', name: 'Root Node', type: 'Oiseau' });
    expect(result.nodes[1]).toMatchObject({ id: 'u2', name: 'Neighbor Node', type: 'Product' });
    expect(result.links).toEqual([{ source: 'u1', target: 'u2', type: 'OWNS' }]);
    
    expect(mockRun).toHaveBeenCalled();
    expect(mockClose).toHaveBeenCalled();
  });

  it('doit encapsuler la récupération dans unstable_cache en dehors de l\'environnement de test', async () => {
    vi.stubEnv('NODE_ENV', 'production');

    const mockRun = vi.fn().mockResolvedValue({ records: [] });
    const mockClose = vi.fn().mockResolvedValue(true);

    vi.mocked(getNeo4jSession).mockReturnValue({
      run: mockRun,
      close: mockClose,
    } as any);

    const result = await getCachedGraphData('u999');

    expect(result).toEqual({ nodes: [], links: [] });
    expect(unstable_cache).toHaveBeenCalled();
  });
});