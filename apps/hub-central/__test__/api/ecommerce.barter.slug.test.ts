import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/barter/route';
import { BarterOfferModel, OiseauModel } from '@ilot/infrastructure';
import { EcommerceOrchestrator } from '@ilot/shared-core';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';

// Mock global de l'infrastructure (pleinement chaînable)
vi.mock('@ilot/infrastructure', () => ({
    BarterOfferModel: {
        create: vi.fn(),
        findOneAndUpdate: vi.fn(),
        find: vi.fn().mockReturnValue({
            sort: vi.fn().mockReturnValue({
                lean: vi.fn().mockResolvedValue([]),
            }),
        }),
    },
    OiseauModel: {
        findOne: vi.fn().mockReturnValue({
            lean: vi.fn().mockResolvedValue(null)
        }),
    },
}));

// Mock des gardiens d'API (`withAura`)
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
                // @ts-ignore
                return await handler(req, context, mockUser);
            };
        },
        withSilice: (handler: unknown) => async (req: NextRequest, context: ApiContext) => {
            // @ts-ignore
            return await handler(req, context);
        },
    };
});

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
    unstable_cache: vi.fn((cb: Function) => cb),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('POST /api/ecommerce/barter (Douane Vibratoire du Troc)', () => {
    const postHandler = POST as unknown as RouteHandler;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = { uid: 'bird_clean_1', capabilities: ['*'] };

        // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur le prototype de EcommerceOrchestrator
        vi.spyOn(EcommerceOrchestrator.prototype, 'proposeBarter').mockResolvedValue({
            success: true,
            barterUid: 'barter_123'
        } as unknown as Awaited<ReturnType<EcommerceOrchestrator['proposeBarter']>>);
        
        vi.spyOn(EcommerceOrchestrator.prototype, 'resolveBarter').mockResolvedValue({
            success: true,
            status: 'ACCEPTED'
        } as unknown as Awaited<ReturnType<EcommerceOrchestrator['resolveBarter']>>);
    });

    it('🔴 doit rejeter avec une erreur 403 si l oiseau est classé INDESIRABLE ou banni', async () => {
        // Simulation de findOne().lean()
        vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'INDESIRABLE',
                isBanned: false,
            })
        } as unknown as ReturnType<typeof OiseauModel.findOne>);

        const req = new NextRequest('http://localhost/api/ecommerce/barter', {
            method: 'POST',
            body: JSON.stringify({ receiverUid: 'bird_target_2', offeredProductUids: ['prod_1'], requestedProductUids: ['prod_2'] }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.error).toContain('Souveraineté restreinte');
        expect(BarterOfferModel.create).not.toHaveBeenCalled();
    });

    it('🟢 doit autoriser la proposition de troc si l oiseau est respectueux ou neutre', async () => {
        // Simulation de findOne().lean()
        vi.mocked(OiseauModel.findOne).mockReturnValueOnce({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'RESPECTABLE',
                isBanned: false,
            })
        } as unknown as ReturnType<typeof OiseauModel.findOne>);

        vi.mocked(BarterOfferModel.create).mockResolvedValueOnce({
            uid: 'barter_123',
            initiatorUid: 'bird_clean_1',
            status: 'PENDING'
        } as unknown as Awaited<ReturnType<typeof BarterOfferModel.create>>);

        const req = new NextRequest('http://localhost/api/ecommerce/barter', {
            method: 'POST',
            body: JSON.stringify({ receiverUid: 'bird_target_2', offeredProductUids: ['prod_1'], requestedProductUids: ['prod_2'] }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as { success: boolean; data: { uid: string } };

        expect(response.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('uid', 'barter_123');
        expect(BarterOfferModel.create).toHaveBeenCalledTimes(1);
    });
});