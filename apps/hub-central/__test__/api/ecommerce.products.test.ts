import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/products/route';
import { ProductModel, OiseauModel } from '@ilot/infrastructure';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';
import { EcommerceOrchestrator } from '@ilot/shared-core';

// Mock global de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
    ProductModel: {
        findOne: vi.fn(),
        find: vi.fn(),
    },
    OiseauModel: {
        findOne: vi.fn(),
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
                    return NextResponse.json({ success: false, error: "Oiseau non identifié." }, { status: 401 });
                }
                // @ts-ignore
                return await handler(req, context, mockUser);
            };
        },
        withSilice: (handler: unknown) => handler,
        handleRouteError: (error: unknown, defaultMessage: string) => {
            console.error("🔥 ERREUR INTERNE CAPTURÉE PAR LA ROUTE:", error);
            const status = (error as { status?: number }).status || 500;
            const message = (error as { message?: string }).message || defaultMessage;
            return NextResponse.json({ success: false, error: message }, { status });
        }
    };
});

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
    unstable_cache: (fn: Function) => fn,
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('POST /api/ecommerce/products (Douane Vibratoire du Catalogue)', () => {
    const postHandler = POST as unknown as RouteHandler;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = { uid: 'bird_clean_1', capabilities: ['*'] };

        // 🛡️ Espion/Mock de l'orchestrateur exactement comme pour la Bibliotek pour éviter de toucher à Mongoose/Neo4j
        vi.spyOn(EcommerceOrchestrator.prototype, 'createProduct').mockResolvedValue({
            success: true,
            productUid: 'prod_123'
        });
    });

    it('🔴 doit rejeter avec une erreur 403 si l\'oiseau est classé INDESIRABLE ou banni', async () => {
        vi.mocked(OiseauModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'INDESIRABLE',
                isBanned: false,
            })
        } as unknown as ReturnType<typeof OiseauModel.findOne>);

        const req = new NextRequest('http://localhost/api/ecommerce/products', {
            method: 'POST',
            body: JSON.stringify({ title: 'Artefact Interdit', priceCents: 1000, category: 'PHYSICAL_ARTIFACT', storeUid: 'store_1', description: 'Test' }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as { success: boolean; error: string };

        expect(response.status).toBe(403);
        expect(json.error).toContain('Souveraineté restreinte');
    });

    it('🔴 doit rejeter avec une erreur 400 si le payload ne respecte pas le contrat Zod', async () => {
        vi.mocked(OiseauModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'RESPECTABLE',
                isBanned: false,
            })
        } as unknown as ReturnType<typeof OiseauModel.findOne>);

        const req = new NextRequest('http://localhost/api/ecommerce/products', {
            method: 'POST',
            body: JSON.stringify({ title: 'Artefact Invalide', priceCents: -50 }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as { success: boolean; error: string };

        expect(response.status).toBe(400);
        expect(json.error).toContain('Contrat souverain invalide');
    });

    it('🟢 doit autoriser l\'ajout et transmettre tags, roulette et mise à l\'Orchestrateur', async () => {
        vi.mocked(OiseauModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'RESPECTABLE',
                isBanned: false,
            })
        } as unknown as ReturnType<typeof OiseauModel.findOne>);

        vi.mocked(ProductModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce(null)
        } as unknown as ReturnType<typeof ProductModel.findOne>);

        const req = new NextRequest('http://localhost/api/ecommerce/products', {
            method: 'POST',
            body: JSON.stringify({ 
                uid: 'prod_test',
                storeUid: 'store_1',
                title: 'Artefact Lumineux', 
                description: 'Un bel objet',
                priceCents: 1500, 
                priceExclTaxCents: 1250,
                category: 'DIGITAL_GOOD',
                nature: 'DIGITAL',
                slug: 'artefact-lumineux',
                tags: ['magie', 'rare'],
                isRouletteActive: true,
                wagerAmount: 5
            }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as any;

        expect(response.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('uid');
        
        // Vérification de la transmission des champs vers l'orchestrateur espionné
        expect(EcommerceOrchestrator.prototype.createProduct).toHaveBeenCalledTimes(1);
        expect(EcommerceOrchestrator.prototype.createProduct).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Artefact Lumineux',
                tags: ['magie', 'rare'],
                isRouletteActive: true,
                wagerAmount: 5
            }),
            expect.objectContaining({
                actorUid: 'bird_clean_1'
            })
        );
    });
});