import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/roulette/route';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';
import { EcommerceOrchestrator, IlotError } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
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
        handleRouteError: (error: unknown, defaultMessage: string) => {
            const status = (error as { status?: number }).status || 500;
            const message = (error as { message?: string }).message || defaultMessage;
            return NextResponse.json({ success: false, error: message }, { status });
        }
    };
});

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('POST /api/ecommerce/roulette (La Roue Karmique)', () => {
    const postHandler = POST as unknown as RouteHandler;
    let mockSpinRoulette: any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = { uid: 'bird_buyer_1', capabilities: [] };

        // Espion sur l'orchestrateur
        mockSpinRoulette = vi.spyOn(EcommerceOrchestrator.prototype, 'spinKarmicRoulette');
    });

    it('🔴 doit rejeter avec une erreur 401 si l\'Oiseau n\'est pas connecté', async () => {
        delete global.__mockUser;

        const req = new NextRequest('http://localhost/api/ecommerce/roulette', {
            method: 'POST',
            body: JSON.stringify({ productUid: 'prod_123' }),
        });

        const response = await postHandler(req, {} as ApiContext);
        expect(response.status).toBe(401);
    });

    it('🔴 doit rejeter avec une erreur 400 si le productUid est manquant', async () => {
        const req = new NextRequest('http://localhost/api/ecommerce/roulette', {
            method: 'POST',
            body: JSON.stringify({}),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as { success: boolean; error: string };

        expect(response.status).toBe(400);
        expect(json.error).toContain('Contrat souverain invalide');
    });

    it('🔴 doit intercepter l\'erreur 403 (verrouillage 24h) levée par l\'orchestrateur', async () => {
        mockSpinRoulette.mockRejectedValueOnce(
            new IlotError("Vous avez déjà une session en cours pour cet artefact. Revenez demain.", "FORBIDDEN", 403)
        );

        const req = new NextRequest('http://localhost/api/ecommerce/roulette', {
            method: 'POST',
            body: JSON.stringify({ productUid: 'prod_123' }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as { success: boolean; error: string };

        expect(response.status).toBe(403);
        expect(json.error).toContain('session en cours');
    });

    it('🟢 doit autoriser le tirage de la roulette karmique et retourner le prix secret (200)', async () => {
        mockSpinRoulette.mockResolvedValueOnce({
            success: true,
            sessionUid: 'sess_999',
            price: 1050
        });

        const req = new NextRequest('http://localhost/api/ecommerce/roulette', {
            method: 'POST',
            body: JSON.stringify({ productUid: 'prod_123' }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as any;

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('sessionUid', 'sess_999');
        expect(json.data).toHaveProperty('price', 1050);
        expect(mockSpinRoulette).toHaveBeenCalledTimes(1);
    });
});