import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/raffles/route';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';
import { RaffleOrchestrator, IlotError } from '@ilot/shared-core';

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

describe('POST /api/raffles (Création de Loterie)', () => {
    const postHandler = POST as unknown as RouteHandler;
    let mockCreateRaffle: any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = { uid: 'bird_seller_1', capabilities: [] };
        mockCreateRaffle = vi.spyOn(RaffleOrchestrator.prototype, 'createRaffle');
    });

    it('🔴 doit rejeter (401) si l\'Oiseau n\'est pas connecté', async () => {
        delete global.__mockUser;

        const req = new NextRequest('http://localhost/api/raffles', {
            method: 'POST',
            body: JSON.stringify({ prizeProductUid: 'prod_1', ticketPriceShards: 100, drawDate: '2026-12-31' }),
        });

        const res = await postHandler(req, {} as ApiContext);
        expect(res.status).toBe(401);
    });

    it('🔴 doit rejeter (403) si le vendeur a déjà une loterie OPEN', async () => {
        mockCreateRaffle.mockRejectedValueOnce(
            new IlotError("Vous avez déjà une loterie en cours. Limite fixée à 1.", "FORBIDDEN", 403)
        );

        const req = new NextRequest('http://localhost/api/raffles', {
            method: 'POST',
            body: JSON.stringify({ prizeProductUid: 'prod_1', ticketPriceShards: 100, drawDate: '2026-12-31' }),
        });

        const res = await postHandler(req, {} as ApiContext);
        const json = await res.json() as any;

        expect(res.status).toBe(403);
        expect(json.error).toContain('loterie en cours');
    });

    it('🟢 doit créer la loterie avec succès et retourner 201', async () => {
        mockCreateRaffle.mockResolvedValueOnce({ success: true, raffleUid: 'raffle_abc' });

        const req = new NextRequest('http://localhost/api/raffles', {
            method: 'POST',
            body: JSON.stringify({ prizeProductUid: 'prod_1', ticketPriceShards: 100, drawDate: '2026-12-31' }),
        });

        const res = await postHandler(req, {} as ApiContext);
        const json = await res.json() as any;

        expect(res.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.data.raffleUid).toBe('raffle_abc');
        expect(mockCreateRaffle).toHaveBeenCalledTimes(1);
    });
});