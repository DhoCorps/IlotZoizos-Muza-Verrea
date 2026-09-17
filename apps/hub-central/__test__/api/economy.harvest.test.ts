import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/economy/harvest/route';
import { EconomyService } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// 🛡️ MOCK GLOBAL : Next Cache
vi.mock('next/cache', () => ({
  revalidateTag: vi.fn(),
  unstable_cache: vi.fn((cb: Function) => cb),
}));

// 🛡️ MOCK DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    EconomyService: {
      addResources: vi.fn(),
    },
    IlotError: class extends Error { 
      status: number; 
      constructor(m: string, s: number) { 
        super(m); 
        this.status = s; 
      } 
    }
  };
});

// 🛡️ MOCK DU GARDE D'AURA
vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withAura: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
      // @ts-ignore
      return await handler(req, context, { uid: 'bird_test_123', capabilities: ['*'] });
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number; statusCode?: number }).status || (error as { statusCode?: number }).statusCode || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ success: false, error: message }, { status });
    }
  };
});

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('POST /api/economy/harvest', () => {
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('doit verser des ressources dans l\'alvéole et invalider le cache', async () => {
    vi.mocked(EconomyService.addResources).mockResolvedValue({ 
      parchemins: 10, 
      plumes: 0, 
      vinyles: 0, 
      sampleNotes: 0, 
      totamtoes: 0 
    } as unknown as Awaited<ReturnType<typeof EconomyService.addResources>>);
    
    // Test d'un envoi propre
    const req = new NextRequest('http://localhost/api/economy/harvest', {
      method: 'POST',
      body: JSON.stringify({ parchemins: 5 })
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean };
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(EconomyService.addResources).toHaveBeenCalledWith(
      'bird_test_123', 
      expect.objectContaining({ parchemins: 5, plumes: 0 })
    );
    expect(revalidateTag).toHaveBeenCalledWith('economy');
    expect(revalidateTag).toHaveBeenCalledWith('alveole-bird_test_123');
  });

  it('doit rejeter une requête sans corps', async () => {
    // Test d'une erreur de parsing
    const req = new NextRequest('http://localhost/api/economy/harvest', {
      method: 'POST'
      // Pas de body
    });

    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; error: string };
    
    expect(res.status).toBe(400);
    expect(json.error).toBe('Corps de requête illisible.');
  });
});