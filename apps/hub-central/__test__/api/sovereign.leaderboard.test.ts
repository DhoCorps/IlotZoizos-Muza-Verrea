import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/sovereign/leaderboard/route';
import { OiseauModel } from '@ilot/infrastructure';
import { NextRequest } from 'next/server';

// Mock global de l'infrastructure incluant connectToDatabase pour withSilice
vi.mock('@ilot/infrastructure', () => ({
    OiseauModel: {
        find: vi.fn(),
    },
    connectToDatabase: vi.fn().mockResolvedValue(true),
}));

// Mock des gardiens d'API (`withSilice`) et de la gestion d'erreur centralisée
vi.mock('@/lib/api-guards', () => ({
    withSilice: (handler: Function) => handler,
    handleRouteError: (error: unknown, context: string) => {
        const err = error as Error;
        console.error(`[${context}]`, err);
        return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}));

// Mock propre de Next.js cache pour exécuter directement le fetcher pendant les tests
vi.mock('next/cache', () => ({
    unstable_cache: (fn: Function) => fn,
}));

describe('GET /api/sovereign/leaderboard (Le Hall of Fame)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🟢 doit retourner la liste des oiseaux les plus respectables triés par IFV', async () => {
        const mockElite = [
            { uid: 'bird_1', pseudo: 'Phoenix Sélénite', ifvScore: 95, profileStatus: 'RESPECTABLE' },
            { uid: 'bird_2', pseudo: 'Faucon Boréal', ifvScore: 85, profileStatus: 'RESPECTABLE' }
        ];

        // Simulation du chaînage Mongoose (find -> sort -> limit -> select -> lean)
        const leanMock = vi.fn().mockResolvedValueOnce(mockElite);
        const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
        const limitMock = vi.fn().mockReturnValue({ select: selectMock });
        const sortMock = vi.fn().mockReturnValue({ limit: limitMock });
        
        vi.mocked(OiseauModel.find).mockReturnValue({ sort: sortMock } as unknown as ReturnType<typeof OiseauModel.find>);

        const req = new NextRequest('http://localhost/api/sovereign/leaderboard');
        const response = await GET(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.leaderboard).toHaveLength(2);
        expect(json.leaderboard[0].ifvScore).toBe(95);
        expect(OiseauModel.find).toHaveBeenCalledWith({
            profileStatus: 'RESPECTABLE',
            isBanned: { $ne: true }
        });
    });

    it('🔴 doit gérer les erreurs de la Silice avec un code 500', async () => {
        vi.mocked(OiseauModel.find).mockImplementationOnce(() => {
            throw new Error("Panne de la Silice");
        });

        const req = new NextRequest('http://localhost/api/sovereign/leaderboard');
        const response = await GET(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.success).toBe(false);
        expect(json.error).toContain("Panne de la Silice");
    });
});