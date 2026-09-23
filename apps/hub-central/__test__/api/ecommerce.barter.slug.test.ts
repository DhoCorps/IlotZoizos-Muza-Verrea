import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH } from '@/app/api/ecommerce/barter/[slug]/route';
import { BarterOfferModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

vi.mock('@ilot/infrastructure', () => ({
    BarterOfferModel: {},
    findEntityBySlugOrUid: vi.fn(),
    OiseauModel: {
        findOne: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(null)
        }),
    },
}));

vi.mock('@/lib/api-guards', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/lib/api-guards')>();
    return {
        ...actual,
        withAura: (handler: unknown) => {
            return async (req: NextRequest, context: ApiContext) => {
                const mockUser = global.__mockUser;
                if (!mockUser || !mockUser.uid) {
                    return NextResponse.json({ success: false, error: "Oiseau non identifié" }, { status: 401 });
                }
                return await (handler as any)(req, context, mockUser);
            };
        },
        withSilice: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
            return await (handler as any)(req, context);
        },
    };
});

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('GET & PATCH /api/ecommerce/barter/[slug] (Ausculter et Résoudre)', () => {
    const getHandler = GET as unknown as RouteHandler;
    const patchHandler = PATCH as unknown as RouteHandler;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = { uid: 'bird_clean_1', capabilities: ['*'] };

        vi.spyOn(EcommerceOrchestrator.prototype, 'resolveBarter').mockResolvedValue({
            success: true,
            status: 'ACCEPTED'
        } as unknown as Awaited<ReturnType<EcommerceOrchestrator['resolveBarter']>>);
    });

    it('🟢 GET : doit renvoyer les détails d’une offre existante', async () => {
        vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
            uid: 'barter_999',
            initiatorUid: 'bird_1',
            status: 'PENDING'
        } as any);

        const req = new NextRequest('http://localhost/api/ecommerce/barter/barter_999');
        const response = await getHandler(req, { params: Promise.resolve({ slug: 'barter_999' }) } as ApiContext);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.uid).toBe('barter_999');
    });

    it('🟢 PATCH : doit permettre à un oiseau d’accepter le troc', async () => {
        vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce({
            uid: 'barter_999',
            initiatorUid: 'bird_2',
            status: 'PENDING'
        } as any);

        const req = new NextRequest('http://localhost/api/ecommerce/barter/barter_999', {
            method: 'PATCH',
            body: JSON.stringify({ status: 'ACCEPTED' }),
        });

        const response = await patchHandler(req, { params: Promise.resolve({ slug: 'barter_999' }) } as ApiContext);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(EcommerceOrchestrator.prototype.resolveBarter).toHaveBeenCalled();
    });
});