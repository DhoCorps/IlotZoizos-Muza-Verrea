import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/users/onboarding/route';
import { OiseauModel, generateOiseauIdentity } from '@ilot/infrastructure';
import { NextRequest, NextResponse } from 'next/server';

// Mock global de la Silice et des générateurs (Tout centralisé dans infrastructure)
vi.mock('@ilot/infrastructure', () => ({
    OiseauModel: {
        findOne: vi.fn(),
    },
    connectToDatabase: vi.fn().mockResolvedValue(undefined),
    generateOiseauIdentity: vi.fn(),
}));

// Mock de `withAura` pour simuler l'injection de `currentUser`
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: Function) => {
        return async (req: NextRequest, context: unknown) => {
            const mockCurrentUser = { uid: 'bird_new_123', capabilities: ['*'] };
            return await handler(req, context, mockCurrentUser);
        };
    },
    handleRouteError: (error: unknown, context: string) => {
        const err = error as Error;
        console.error(`[${context}]`, err);
        return new Response(JSON.stringify({ success: false, error: err.message || 'Erreur interne.' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}));

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}));

describe('POST /api/users/onboarding (Attribution d\'Identité Organique)', () => {
    let mockOiseauDoc: {
        uid: string;
        pseudo: string | null;
        frequenceHEX: string;
        isOnboarded: boolean;
        slug?: string;
        save: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
        delete global.__mockUser;

        mockOiseauDoc = {
            uid: 'bird_new_123',
            pseudo: null,
            frequenceHEX: '#2D3748',
            isOnboarded: false,
            save: vi.fn().mockResolvedValue(true),
        };
    });

    it('🟢 doit attribuer une identité organique (pseudo + HEX) et finaliser l onboarding', async () => {
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockOiseauDoc as unknown as Awaited<ReturnType<typeof OiseauModel.findOne>>);
        
        // On mocke directement la fonction importée
        vi.mocked(generateOiseauIdentity).mockResolvedValueOnce({
            pseudo: 'Ombre Céleste Observe',
            frequenceHEX: '#C53030'
        });

        const req = new NextRequest('http://localhost/api/users/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data.pseudo).toBe('Ombre Céleste Observe');
        expect(json.data.frequenceHEX).toBe('#C53030');
        expect(mockOiseauDoc.isOnboarded).toBe(true);
        expect(mockOiseauDoc.save).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit renvoyer une erreur 404 si l oiseau n est pas trouvé dans la matrice', async () => {
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(null);

        const req = new NextRequest('http://localhost/api/users/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toBeDefined();
        expect(json.error).toContain('Empreinte introuvable');
    });

    it('🟢 doit renvoyer l identité existante si l oiseau a déjà passé l onboarding', async () => {
        mockOiseauDoc.isOnboarded = true;
        mockOiseauDoc.pseudo = 'Faucon Déjà Éveillé';
        
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockOiseauDoc as unknown as Awaited<ReturnType<typeof OiseauModel.findOne>>);

        const req = new NextRequest('http://localhost/api/users/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toContain('déjà franchi la porte');
        expect(json.data.pseudo).toBe('Faucon Déjà Éveillé');
        expect(mockOiseauDoc.save).not.toHaveBeenCalled();
    });
});