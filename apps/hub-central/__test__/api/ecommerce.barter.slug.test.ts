import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/ecommerce/barter/[slug]/route';
import { BarterOfferModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { NextResponse } from 'next/server';

// On mock api-guards pour éviter les erreurs de getServerSession et headers
vi.mock('@/lib/api-guards', () => ({
  withSilice: (handler: any) => handler,
  withAura: (handler: any) => async (req: any, ctx: any) => {
    const mockUser = global.__mockUser;
    if (!mockUser || !mockUser.uid) return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    return await handler(req, ctx, mockUser);
  },
}));

vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), unstable_cache: vi.fn((cb) => cb) }));
vi.mock('@/lib/slugify', () => ({ slugify: (s: string) => s }));
vi.mock('@ilot/infrastructure', () => ({
  connectToDatabase: vi.fn().mockResolvedValue(true),
  BarterOfferModel: { findOne: vi.fn() },
}));

describe('API Barter Slug', () => {
  beforeEach(() => { 
    vi.clearAllMocks(); 
    global.__mockUser = undefined;

    // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de EcommerceOrchestrator
    vi.spyOn(EcommerceOrchestrator.prototype, 'resolveBarter').mockResolvedValue({
      status: 'ACCEPTED',
    } as any);
  });

  it('🟢 [GET] doit retourner 200', async () => {
    vi.mocked(BarterOfferModel.findOne).mockReturnValue({ lean: vi.fn().mockResolvedValue({ uid: 'b1' }) } as any);
    const res = await GET(new Request('http://h'), { params: Promise.resolve({ slug: 'b1' }) });
    expect(res.status).toBe(200);
  });

  it('🟢 [PATCH] doit résoudre avec succès', async () => {
    global.__mockUser = { uid: 'u1', capabilities: [] };
    const res = await PATCH(new Request('http://h', { method: 'PATCH', body: JSON.stringify({ status: 'ACCEPTED' }) }), { params: Promise.resolve({ slug: 'b1' }) });
    expect(res.status).toBe(200);
  });
});