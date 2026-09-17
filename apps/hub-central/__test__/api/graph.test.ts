import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/graph/context/route';
import { getNeo4jSession } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

vi.mock('@/lib/api-guards', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-guards')>();
  return {
    ...actual,
    withSilice: (handler: unknown) => async (req: NextRequest, ctx: ApiContext) => {
      // @ts-ignore
      return await handler(req, ctx);
    },
    handleRouteError: (error: unknown, defaultMessage: string) => {
      const status = (error as { status?: number; statusCode?: number }).status || (error as { statusCode?: number }).statusCode || 500;
      const message = (error as { message?: string }).message || defaultMessage;
      return NextResponse.json({ nodes: [], links: [], error: message }, { status });
    }
  };
});

vi.mock('@ilot/infrastructure', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
  return {
    ...actual,
    getNeo4jSession: vi.fn(),
  };
});

vi.mock('next/cache', () => ({ 
  unstable_cache: vi.fn((cb: Function) => cb),
  revalidateTag: vi.fn(),
}));

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('API Graph Neo4j', () => {
  const getHandler = GET as unknown as RouteHandler;

  beforeEach(() => {
    vi.clearAllMocks();
    delete (global as { __mockUser?: unknown }).__mockUser;
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
      close: vi.fn().mockResolvedValue(true),
    };
    vi.mocked(getNeo4jSession).mockReturnValue(mockSession as unknown as ReturnType<typeof getNeo4jSession>);

    const req = new NextRequest('http://localhost/api/context?uid=1');
    const res = await getHandler(req, {} as ApiContext);
    const json = await res.json() as { nodes: Array<unknown>; links: Array<{ type: string }> };

    expect(res.status).toBe(200);
    expect(json.nodes).toHaveLength(2);
    expect(json.links[0].type).toBe('LINKED');
    expect(mockSession.close).toHaveBeenCalled();
  });
});