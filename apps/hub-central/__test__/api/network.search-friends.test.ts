import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/network/search-friends/route';
import { NextResponse, NextRequest } from 'next/server';
import type { ApiContext } from '@/lib/api-guards';
import { getNeo4jSession } from '@ilot/infrastructure';

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

vi.mock('@ilot/infrastructure', () => ({
    getNeo4jSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}));

declare global {
  var __mockUser: { [key: string]: unknown; uid: string; capabilities: string[] } | undefined;
}

type RouteHandler = (req: NextRequest, ctx: ApiContext) => Promise<Response>;

describe('GET /api/network/search-friends (Autocomplétion Neo4j)', () => {
    const getHandler = GET as unknown as RouteHandler;
    let mockRun: any;
    let mockClose: any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = { uid: 'bird_user_1', capabilities: [] };

        mockRun = vi.fn();
        mockClose = vi.fn().mockResolvedValue(true);

        vi.mocked(getNeo4jSession).mockReturnValue({
            run: mockRun,
            close: mockClose,
        } as any);
    });

    it('🔴 doit rejeter avec une erreur 401 si l\'Oiseau n\'est pas authentifié', async () => {
        delete global.__mockUser;

        const req = new NextRequest('http://localhost/api/network/search-friends?q=plume');
        const res = await getHandler(req, {} as ApiContext);

        expect(res.status).toBe(401);
    });

    it('🟢 doit retourner un tableau vide si aucun terme de recherche n\'est fourni', async () => {
        const req = new NextRequest('http://localhost/api/network/search-friends');
        const res = await getHandler(req, {} as ApiContext);
        const json = await res.json() as any;

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toEqual([]);
        expect(mockRun).not.toHaveBeenCalled();
    });

    it('🟢 doit exécuter la requête Neo4j et retourner les amis correspondants', async () => {
        mockRun.mockResolvedValueOnce({
            records: [
                {
                    get: (field: string) => {
                        if (field === 'uid') return 'friend_2';
                        if (field === 'matchPseudo') return 'Plume Sereine';
                        if (field === 'avatarUrl') return 'https://cdn.ilot/avatars/2.png';
                        return null;
                    }
                }
            ]
        });

        const req = new NextRequest('http://localhost/api/network/search-friends?q=Plume');
        const res = await getHandler(req, {} as ApiContext);
        const json = await res.json() as any;

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toHaveLength(1);
        expect(json.data[0]).toEqual({
            uid: 'friend_2',
            matchPseudo: 'Plume Sereine',
            avatarUrl: 'https://cdn.ilot/avatars/2.png'
        });
        expect(mockRun).toHaveBeenCalledTimes(1);
        expect(mockClose).toHaveBeenCalledTimes(1);
    });
});