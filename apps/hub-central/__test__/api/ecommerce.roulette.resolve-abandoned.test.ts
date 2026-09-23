import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '@/app/api/ecommerce/roulette/resolve-abandoned/route';
import { NextResponse, NextRequest } from 'next/server';
import { EcommerceOrchestrator, IlotError } from '@ilot/shared-core';

// -------------------------------------------------------------------------
// 🎭 MOCKS DE L'ENVIRONNEMENT ET DES DÉPENDANCES
// -------------------------------------------------------------------------
vi.mock('next/cache', () => ({
    revalidateTag: vi.fn(),
}));

describe('POST /api/internal/roulette/resolve-abandoned (Cron Job Résolution Abandons)', () => {
    let mockResolveAbandoned: any;

    beforeEach(() => {
        vi.clearAllMocks();
        // Configuration d'un secret de test par défaut
        process.env.INTERNAL_CRON_SECRET = 'secret-test-123';

        // Espion sur la méthode de l'orchestrateur
        mockResolveAbandoned = vi.spyOn(EcommerceOrchestrator.prototype, 'resolveAbandonedRoulette');
    });

    it('🔴 doit rejeter avec une erreur 401 si le secret interne (x-internal-secret) est absent ou invalide', async () => {
        const req = new NextRequest('http://localhost/api/internal/roulette/resolve-abandoned', {
            method: 'POST',
            headers: {
                'x-internal-secret': 'mauvais-secret',
            },
            body: JSON.stringify({ sessionUid: 'sess_123' }),
        });

        const res = await POST(req);
        const json = await res.json() as { success: boolean; error: string };

        expect(res.status).toBe(401);
        expect(json.success).toBe(false);
        expect(json.error).toContain('Accès non autorisé');
        expect(mockResolveAbandoned).not.toHaveBeenCalled();
    });

    it('🔴 doit rejeter avec une erreur 400 si le sessionUid est manquant dans le payload', async () => {
        const req = new NextRequest('http://localhost/api/internal/roulette/resolve-abandoned', {
            method: 'POST',
            headers: {
                'x-internal-secret': 'secret-test-123',
            },
            body: JSON.stringify({}),
        });

        const res = await POST(req);
        const json = await res.json() as { success: boolean; error: string };

        expect(res.status).toBe(400);
        expect(json.success).toBe(false);
        expect(json.error).toContain('Contrat souverain invalide');
        expect(mockResolveAbandoned).not.toHaveBeenCalled();
    });

    it('🔴 doit intercepter l\'erreur levée par l\'orchestrateur (ex: session non expirée ou introuvable)', async () => {
        mockResolveAbandoned.mockRejectedValueOnce(
            new IlotError("La session n'a pas encore expiré", "FORBIDDEN", 403)
        );

        const req = new NextRequest('http://localhost/api/internal/roulette/resolve-abandoned', {
            method: 'POST',
            headers: {
                'x-internal-secret': 'secret-test-123',
            },
            body: JSON.stringify({ sessionUid: 'sess_123' }),
        });

        const res = await POST(req);
        const json = await res.json() as { success: boolean; error: string };

        expect(res.status).toBe(403);
        expect(json.success).toBe(false);
        expect(json.error).toContain("La session n'a pas encore expiré");
    });

    it('🟢 doit résoudre la session de roulette abandonnée avec succès et retourner un statut 200', async () => {
        mockResolveAbandoned.mockResolvedValueOnce({
            success: true,
            sessionUid: 'sess_123'
        });

        const req = new NextRequest('http://localhost/api/internal/roulette/resolve-abandoned', {
            method: 'POST',
            headers: {
                'x-internal-secret': 'secret-test-123',
            },
            body: JSON.stringify({ sessionUid: 'sess_123' }),
        });

        const res = await POST(req);
        const json = await res.json() as any;

        expect(res.status).toBe(200);
        expect(json.success).toBe(true);
        expect(json.data).toHaveProperty('sessionUid', 'sess_123');
        expect(mockResolveAbandoned).toHaveBeenCalledTimes(1);
        expect(mockResolveAbandoned).toHaveBeenCalledWith('sess_123');
    });
});