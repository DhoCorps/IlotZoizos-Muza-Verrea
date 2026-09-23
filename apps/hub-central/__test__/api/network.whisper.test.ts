import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/network/whisper/route';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';
import { NotificationOrchestrator } from '@ilot/shared-core';

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

describe('POST /api/network/whisper (Murmurer / Partager)', () => {
    const postHandler = POST as unknown as RouteHandler;
    let mockFosterNotification: any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = { uid: 'bird_sender_1', capabilities: [] };

        // Espion sur l'orchestrateur retournant une structure complète conforme à NotificationSyncResult
        mockFosterNotification = vi.spyOn(NotificationOrchestrator.prototype, 'fosterNotification').mockResolvedValue({
            success: true,
            status: 'created',
            mongo: null,
            neo4j: null,
            isGrouped: false
        });
    });

    it('🔴 doit rejeter avec une erreur 401 si l\'Oiseau n\'est pas authentifié', async () => {
        delete global.__mockUser;

        const req = new NextRequest('http://localhost/api/network/whisper', {
            method: 'POST',
            body: JSON.stringify({ targetUids: ['bird_target_1'], artifactUrl: 'https://ilot.zen/product/1' }),
        });

        const response = await postHandler(req, {} as ApiContext);
        expect(response.status).toBe(401);
    });

    it('🔴 doit rejeter avec une erreur 400 si le payload est invalide (cibles ou URL manquantes)', async () => {
        const req = new NextRequest('http://localhost/api/network/whisper', {
            method: 'POST',
            body: JSON.stringify({ targetUids: [], artifactUrl: '' }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as { success: boolean; error: string };

        expect(response.status).toBe(400);
        expect(json.error).toContain('Contrat souverain invalide');
    });

    it('🟢 doit transmettre les murmures aux cibles avec succès et retourner un statut 200', async () => {
        const req = new NextRequest('http://localhost/api/network/whisper', {
            method: 'POST',
            body: JSON.stringify({ 
                targetUids: ['bird_target_1', 'bird_target_2'], 
                artifactUrl: 'https://ilot.zen/product/1',
                message: 'Regarde cet artefact magnifique !'
            }),
        });

        const response = await postHandler(req, {} as ApiContext);
        const json = await response.json() as any;

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data.sentCount).toBe(2);
        expect(mockFosterNotification).toHaveBeenCalledTimes(2);
    });
});