import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/sovereign/judgment/route';
import { OiseauModel, findEntityBySlugOrUid } from '@ilot/infrastructure';
import { CanopyJudgeEngine } from '@ilot/shared-core';
import { NextRequest, NextResponse } from 'next/server';

// Mock global de l'infrastructure
vi.mock('@ilot/infrastructure', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@ilot/infrastructure')>();
    return {
        ...actual,
        OiseauModel: {
            findOne: vi.fn(),
            updateOne: vi.fn(),
        },
        LedgerEntryModel: {
            countDocuments: vi.fn().mockResolvedValue(0),
        },
        // 🛡️ Protocole appliqué : Mock du helper unifié centralisé
        findEntityBySlugOrUid: vi.fn(),
    };
});

// Mock des gardiens d'API (`withAura`)
let mockUserCapabilities: string[] = ['*'];
vi.mock('@/lib/api-guards', () => ({
    withAura: (handler: Function) => {
        return async (req: NextRequest, context: unknown) => {
            const mockCurrentUser = { uid: 'architect_1', capabilities: mockUserCapabilities };
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

describe('POST /api/sovereign/judgment (Le Tribunal de la Canopée)', () => {
    let mockTargetOiseau: {
        uid: string;
        isBanned: boolean;
        ifvScore: number;
        profileStatus: string;
        bannedFingerprint: string;
        save: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        vi.clearAllMocks();
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

        const req = new NextRequest('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'JUDGE' }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(403);
        expect(json.success).toBe(false);
        expect(json.error).toContain('Aura insuffisante');
    });

    it('🟢 doit prononcer le bannissement éternel si le profil est jugé indésirable', async () => {
        vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockTargetOiseau as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

        const req = new NextRequest('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'JUDGE' }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.isBanned).toBe(true);
        expect(json.message).toContain('banni à vie');
        expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'bird_target_99', { lean: false });
        expect(CanopyJudgeEngine.judgeAndExecute).toHaveBeenCalledTimes(1);
    });

    it('🟢 doit accorder le pardon souverain et lever le bannissement si l action est PARDON', async () => {
        mockTargetOiseau.isBanned = true;
        vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(mockTargetOiseau as unknown as Awaited<ReturnType<typeof findEntityBySlugOrUid>>);

        const req = new NextRequest('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'PARDON' }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.message).toContain('libéré de sa stase');
        expect(mockTargetOiseau.isBanned).toBe(false);
        expect(mockTargetOiseau.save).toHaveBeenCalledTimes(1);
        expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'bird_target_99', { lean: false });
    });

    it('🔴 doit renvoyer une erreur 404 si la cible du jugement est introuvable', async () => {
        vi.mocked(findEntityBySlugOrUid).mockResolvedValueOnce(null);

        const req = new NextRequest('http://localhost/api/sovereign/judgment', {
            method: 'POST',
            body: JSON.stringify({ targetUid: 'bird_target_99', action: 'JUDGE' }),
            headers: { 'Content-Type': 'application/json' }
        });

        const response = await POST(req, { params: Promise.resolve({}) });
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.success).toBe(false);
        expect(json.error).toContain('Oiseau introuvable');
        expect(findEntityBySlugOrUid).toHaveBeenCalledWith(OiseauModel, 'bird_target_99', { lean: false });
    });
});