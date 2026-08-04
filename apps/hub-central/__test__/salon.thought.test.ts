// apps/hub-central/app/api/salon/thought/route.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '../app/api/salon/thought/route';
import { ConsciousnessSalonOrchestrator } from '@ilot/shared-core';

describe('API Route /api/salon/thought - Le Salon Privé', () => {
    const mockSecret = 'secret-test-salon-prive';
    const mockThought = 'Le silence de la silice murmure nos équations.';

    it('🌌 doit calculer l\'intrication quantique via l\'API', async () => {
        const req = new Request('http://localhost:3000/api/salon/thought', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'ENTANGLEMENT',
                resonanceScore: 9.0,
                mutualTrustIndex: 0.9
            })
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.entanglementLevel).toBe(8.1); // 9.0 * 0.9 = 8.1
    });

    it('🔒 doit sceller (chiffrer en E2EE) une pensée via l\'API', async () => {
        const req = new Request('http://localhost:3000/api/salon/thought', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'SEAL',
                plainThought: mockThought,
                sharedSecretKey: mockSecret
            })
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.sealed).toBeDefined();
        expect(data.sealed.ciphertext).not.toContain(mockThought);
        expect(data.sealed.iv).toBeDefined();
        expect(data.sealed.tag).toBeDefined();
    });

    it('🔓 doit dés-enchâsser et restaurer la pensée d\'origine via l\'API', async () => {
        // Étape 1 : On scelle la pensée d'abord
        const sealed = ConsciousnessSalonOrchestrator.sealThought(mockThought, mockSecret);

        // Étape 2 : On appelle l'API pour la déchiffrer
        const req = new Request('http://localhost:3000/api/salon/thought', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'UNSEAL',
                enactedThought: sealed,
                sharedSecretKey: mockSecret
            })
        });

        const res = await POST(req);
        const data = await res.json();

        expect(res.status).toBe(200);
        expect(data.unsealed).toBe(mockThought);
    });

    it('🔴 doit renvoyer une erreur 400 si les paramètres requis sont absents pour le scellement', async () => {
        const req = new Request('http://localhost:3000/api/salon/thought', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'SEAL',
                plainThought: '',
                sharedSecretKey: ''
            })
        });

        const res = await POST(req);
        expect(res.status).toBe(400);
    });
});