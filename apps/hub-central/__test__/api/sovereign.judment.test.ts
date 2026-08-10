import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../app/api/sovereign/judgment/route';
import { OiseauModel } from '@ilot/infrastructure';
import { CanopyJudgeEngine } from '@ilot/shared-core';

// Mock global de l'infrastructure
vi.mock('@ilot/infrastructure', () => ({
    OiseauModel: {
        findOne: vi.fn(),
        updateOne: vi.fn(),
    },
    LedgerEntryModel: {
        countDocuments: vi.fn().mockResolvedValue(0),
    },
}));

// Mock des gardiens d'API (`withAura`)
let mockUserCapabilities: string[] = ['*'];
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: any) => {
        return async (req: Request, context: any) => {
            const mockCurrentUser = { uid: 'architect_1', capabilities: mockUserCapabilities };
            return await handler(req, context, mockCurrentUser);
        };
    },
}));

vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}));

describe('POST /api/sovereign/judgment (Le Tribunal de la Canopée)', () => {
    let mockTargetOiseau: any;

    beforeEach(() => {
        vi.clearAllMocks();
        global.__mockUser = undefined;
        mockUserCapabilities = ['*'];

        mockTargetOiseau = {
            uid: 'bird_target_99',
            isBanned: false,
            ifvScore: 50,
            profileStatus: 'NEUTRAL',
            bannedFingerprint: 'fingerprint-123',
            save: vi.fn().mockResolvedValue(true),
        };

        // 🛡️ SUTURE CHIRURGICALE : Espionnage direct sur CanopyJudgeEngine
        vi.spyOn(CanopyJudgeEngine, 'judgeAndExecute').mockResolvedValue(true);
    });

    it('🔴 doit rejeter avec une erreur 403 si l oiseau n a pas l aura d Architecte (*)', async () => {
        mockUserCapabilities = ['some:other:capability'];

        const req = new Request('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'JUDGE' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.success).toBe(false);
        expect(json.error).toContain('Aura insuffisante');
    });

    it('🟢 doit prononcer le bannissement éternel si le profil est jugé indésirable', async () => {
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockTargetOiseau);

        const req = new Request('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'JUDGE' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.isBanned).toBe(true);
        expect(json.message).toContain('banni à vie');
        expect(CanopyJudgeEngine.judgeAndExecute).toHaveBeenCalledTimes(1);
    });

    it('🟢 doit accorder le pardon souverain et lever le bannissement si l action est PARDON', async () => {
        mockTargetOiseau.isBanned = true;
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(mockTargetOiseau);

        const req = new Request('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'PARDON' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toContain('libéré de sa stase');
        expect(mockTargetOiseau.isBanned).toBe(false);
        expect(mockTargetOiseau.save).toHaveBeenCalledTimes(1);
    });

    it('🔴 doit renvoyer une erreur 404 si la cible du jugement est introuvable', async () => {
        vi.mocked(OiseauModel.findOne).mockResolvedValueOnce(null);

        const req = new Request('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'JUDGE' }),
            headers: { 'Content-Type': 'application/json' }
        }) as unknown as import('next/server').NextRequest;

        const response = await POST(req, { params: {} } as any);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.success).toBe(false);
        expect(json.error).toContain('Oiseau introuvable');
    });
});