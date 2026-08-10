import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/ecommerce/barter/route';
import { BarterOfferModel, OiseauModel } from '@ilot/infrastructure';

// Mock global de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
    BarterOfferModel: {
        create: vi.fn(),
        findOneAndUpdate: vi.fn(),
        find: vi.fn(),
    },
    OiseauModel: {
        findOne: vi.fn(),
    },
}));

// Mock de l'orchestrateur e-commerce
vi.mock('@ilot/shared-core', () => ({
    EcommerceOrchestrator: class {
        proposeBarter = vi.fn().mockResolvedValue(true);
        resolveBarter = vi.fn().mockResolvedValue(true);
    }
}));

// Mock des gardiens d'API (`withAura`)
let mockCurrentUser = { uid: 'bird_clean_1', capabilities: ['*'] };
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: any) => {
        return async (req: Request, context: any) => {
            return handler(req, context, mockCurrentUser);
        };
    },
    withSilice: (handler: any) => handler,
}));

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
    unstable_cache: (fn: any) => fn,
}));

describe('POST /api/ecommerce/barter (Douane Vibratoire du Troc)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCurrentUser = { uid: 'bird_clean_1', capabilities: ['*'] };
    });

    it('🔴 doit rejeter avec une erreur 403 si l oiseau est classé INDESIRABLE ou banni', async () => {
        // Simulation de findone().lean() avec un objet retourné par .lean()
        vi.mocked(OiseauModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'INDESIRABLE',
                isBanned: false,
            })
        } as any);

        const req = new Request('http://localhost/api/ecommerce/barter', {
            method: 'POST',
            body: JSON.stringify({ receiverUid: 'bird_target_2', offeredProductUids: ['prod_1'], requestedProductUids: ['prod_2'] }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.error).toContain('Souveraineté restreinte');
        expect(BarterOfferModel.create).not.toHaveBeenCalled();
    });

    it('🟢 doit autoriser la proposition de troc si l oiseau est respectueux ou neutre', async () => {
        // Simulation de findone().lean()
        vi.mocked(OiseauModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'RESPECTABLE',
                isBanned: false,
            })
        } as any);

        vi.mocked(BarterOfferModel.create).mockResolvedValueOnce({
            uid: 'barter_123',
            initiatorUid: 'bird_clean_1',
            status: 'PENDING'
        } as any);

        const req = new Request('http://localhost/api/ecommerce/barter', {
            method: 'POST',
            body: JSON.stringify({ receiverUid: 'bird_target_2', offeredProductUids: ['prod_1'], requestedProductUids: ['prod_2'] }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('uid', 'barter_123');
        expect(BarterOfferModel.create).toHaveBeenCalledTimes(1);
    });
});