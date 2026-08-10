import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/ecommerce/products/route';
import { ProductModel, OiseauModel } from '@ilot/infrastructure';

// Mock global de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
    ProductModel: {
        create: vi.fn(),
        findOne: vi.fn(),
        find: vi.fn(),
    },
    OiseauModel: {
        findOne: vi.fn(),
    },
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

describe('POST /api/ecommerce/products (Douane Vibratoire du Catalogue)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockCurrentUser = { uid: 'bird_clean_1', capabilities: ['*'] };
    });

    it('🔴 doit rejeter avec une erreur 403 si l oiseau est classé INDESIRABLE ou banni', async () => {
        // Simulation d'un profil indésirable avec chaînage .lean()
        vi.mocked(OiseauModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'INDESIRABLE',
                isBanned: false,
            })
        } as any);

        const req = new Request('http://localhost/api/ecommerce/products', {
            method: 'POST',
            body: JSON.stringify({ title: 'Artefact Interdit', priceCents: 1000, category: 'PHYSICAL' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.error).toContain('Souveraineté restreinte');
        expect(ProductModel.create).not.toHaveBeenCalled();
    });

    it('🟢 doit autoriser l ajout d un artefact si l oiseau est respectueux ou neutre', async () => {
        // 1. Simulation du profil sain via findOne().lean()
        vi.mocked(OiseauModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce({
                uid: 'bird_clean_1',
                profileStatus: 'RESPECTABLE',
                isBanned: false,
            })
        } as any);

        // 2. Simulation de la vérification de slug unique (renvoie null pour dire qu'il n'existe pas)
        vi.mocked(ProductModel.findOne).mockReturnValue({
            lean: vi.fn().mockResolvedValueOnce(null)
        } as any);

        vi.mocked(ProductModel.create).mockResolvedValueOnce({
            uid: 'prod_123',
            title: 'Artefact Lumineux',
            slug: 'artefact-lumineux',
            sellerUid: 'bird_clean_1'
        } as any);

        const req = new Request('http://localhost/api/ecommerce/products', {
            method: 'POST',
            body: JSON.stringify({ title: 'Artefact Lumineux', priceCents: 1500, category: 'DIGITAL' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(201);
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('uid', 'prod_123');
        expect(ProductModel.create).toHaveBeenCalledTimes(1);
    });
});