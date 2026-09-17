import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/economy/alveole/route';
import { EconomyService } from '@ilot/infrastructure';
import { revalidateTag } from 'next/cache';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// 🛡️ MOCK GLOBAL : Empêche Next.js de chercher un store de cache
vi.mock('next/cache', () => ({
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn(),
}));

// 🛡️ MOCK DE L'INFRASTRUCTURE
vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    EconomyService: {
      getInventory: vi.fn(),
      upgradeAlveole: vi.fn(),
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

describe('Routes API /economy/alveole', () => {
  const getHandler = GET as unknown as RouteHandler;
  const postHandler = POST as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET - doit retourner l\'inventaire depuis le cache/service', async () => {
    vi.mocked(EconomyService.getInventory).mockResolvedValue({ alveoleLevel: 1, parchemins: 5 } as unknown as Awaited<ReturnType<typeof EconomyService.getInventory>>);
    
    const req = new NextRequest('http://localhost/api/economy/alveole');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; data: { parchemins: number } };
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.parchemins).toBe(5);
  });

  it('POST - doit upgrade l\'alvéole et invalider le cache', async () => {
    vi.mocked(EconomyService.upgradeAlveole).mockResolvedValue({ alveoleLevel: 2, parchemins: 0 } as unknown as Awaited<ReturnType<typeof EconomyService.upgradeAlveole>>);
    
    const req = new NextRequest('http://localhost/api/economy/alveole', { method: 'POST' });
    const res = await postHandler(req, {} as ApiContext);
    const json = await res.json() as { success: boolean; data: { alveoleLevel: number } };
    
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.alveoleLevel).toBe(2);
    expect(EconomyService.upgradeAlveole).toHaveBeenCalledWith('bird_test_123');
    expect(revalidateTag).toHaveBeenCalledWith('economy');
    expect(revalidateTag).toHaveBeenCalledWith('alveole-bird_test_123');
  });
});