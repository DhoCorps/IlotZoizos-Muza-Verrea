import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/taxonomy/route';
import { TaxonomyModel } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextRequest } from 'next/server';

vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb), // Exécution immédiate
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: Function) => handler,
  withAura: (handler: Function) => async (req: NextRequest, context: unknown) => {
    const mockUser = global.__mockUser || { uid: 'u-123', capabilities: ['*'] };
    return await handler(req, context, mockUser);
  },
  handleRouteError: (error: unknown, context: string) => {
    const err = error as Error;
    console.error(`[${context}]`, err);
    return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}));

vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  TaxonomyModel: {
    find: vi.fn(),
    // 🪡 Fix : Simulation du chaînage Mongoose .lean() pour éviter le TypeError
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
    create: vi.fn(),
  },
}));

declare global {
  var __mockUser: {
    uid: string;
    capabilities: string[];
    [key: string]: unknown;
  } | undefined;
}

describe('Route API : Taxonomie (GET / POST)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete global.__mockUser;
  });

  it('GET - doit renvoyer les taxonomies et les valeurs statiques', async () => {
    vi.mocked(TaxonomyModel.find).mockReturnValue({
      sort: () => ({ lean: vi.fn().mockResolvedValue([{ name: 'TestTag' }]) })
    } as unknown as ReturnType<typeof TaxonomyModel.find>);

    const req = new NextRequest('http://localhost/api/taxonomy?domain=TECHNICAL');
    const response = await GET(req, { params: Promise.resolve({}) });
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.data[0].name).toBe('TestTag');
    expect(json.categories).toBeDefined();
  });

  it('POST - doit créer un nouveau tag et invalider le cache', async () => {
    global.__mockUser = { uid: 'u-123', capabilities: ['*'] };
    
    vi.mocked(TaxonomyModel.findOne).mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    } as unknown as ReturnType<typeof TaxonomyModel.findOne>);

    vi.mocked(TaxonomyModel.create).mockResolvedValue({ name: 'NewTag' } as unknown as Awaited<ReturnType<typeof TaxonomyModel.create>>);

    const req = new NextRequest('http://localhost/api/taxonomy', {
      method: 'POST',
      body: JSON.stringify({ name: 'NewTag', domain: 'TECHNICAL', type: 'PROJECT' }),
    });

    const response = await POST(req, { params: Promise.resolve({}) });
    
    expect(response.status).toBe(201);
    expect(revalidateTag).toHaveBeenCalledWith('taxonomy');
  });
});