import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/users/onboarding/route'; // Ajuste le chemin relatif vers ta route si besoin
import { OiseauModel, generateOiseauIdentity } from '@ilot/infrastructure';

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
    withAura: (handler: any) => {
        return async (req: Request, context: any) => {
            const mockCurrentUser = { uid: 'bird_new_123', capabilities: ['*'] };
            return handler(req, context, mockCurrentUser);
        };
    },
}));

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}));

describe('POST /api/oiseau/onboarding (Attribution d\'Identité Organique)', () => {
    let mockOiseauDoc: any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = undefined;

        mockOiseauDoc = {
            uid: 'bird_new_123',
            pseudo: null,
            frequenceHEX: '#2D3748',
            isOnboarded: false,
            save: vi.fn().mockResolvedValue(true),
        };
    });

    it('🟢 doit attribuer une identité organique (pseudo + HEX) et finaliser l onboarding', async () => {
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockOiseauDoc);
        
        // On mocke directement la fonction importée
        vi.mocked(generateOiseauIdentity).mockResolvedValueOnce({
            pseudo: 'Ombre Céleste Observe',
            frequenceHEX: '#C53030'
        } as any);

        const req = new Request('http://localhost/api/oiseau/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: {} } as any);
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

        const req = new Request('http://localhost/api/oiseau/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toBeDefined();
        expect(json.error).toContain('Empreinte introuvable');
    });

    it('🟢 doit renvoyer l identité existante si l oiseau a déjà passé l onboarding', async () => {
        mockOiseauDoc.isOnboarded = true;
        mockOiseauDoc.pseudo = 'Faucon Déjà Éveillé';
        
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockOiseauDoc);

        const req = new Request('http://localhost/api/oiseau/onboarding', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toContain('déjà franchi la porte');
        expect(json.data.pseudo).toBe('Faucon Déjà Éveillé');
        expect(mockOiseauDoc.save).not.toHaveBeenCalled();
    });
});