import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/taxonomy/route';
import { getServerSession } from 'next-auth/next';
import { TaxonomyModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb) => cb), // Exécution immédiate
  revalidateTag: vi.fn(),
}));

vi.mock('next-auth/next', () => ({ getServerSession: vi.fn() }));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TaxonomyModel: {
    find: vi.fn(),
    // 🪡 Fix : Simulation du chaînage Mongoose .lean() pour éviter le TypeError
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    create: vi.fn(),
  },
}));

describe('Route API : Taxonomie (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.__mockUser = undefined;
  });

  it('GET - doit renvoyer les taxonomies et les valeurs statiques', async () => {
    vi.mocked(TaxonomyModel.find).mockReturnValue({
      sort: () => ({ lean: vi.fn().mockResolvedValue([{ name: 'TestTag' }]) })
    } as any);

    const req = new Request('http://localhost/api/taxonomy?domain=TECHNICAL');
    const response = await GET(req as any, {});
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data[0].name).toBe('TestTag');
    expect(json.categories).toBeDefined();
  });

  it('POST - doit créer un nouveau tag et invalider le cache', async () => {
    vi.mocked(getServerSession).mockResolvedValue({ user: { uid: 'u-123' } } as any);
    
    vi.mocked(TaxonomyModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as any);

    vi.mocked(TaxonomyModel.create).mockResolvedValue({ name: 'NewTag' } as any);

    const req = new Request('http://localhost/api/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ name: 'NewTag', domain: 'TECHNICAL', type: 'PROJECT' }),
    });

    const response = await POST(req as any, {});
    
    expect(response.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith('taxonomy');
  });
});