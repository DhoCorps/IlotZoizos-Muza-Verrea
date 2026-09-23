import { describe, it, expect } from 'vitest';
import { RouletteModel } from '../../nosql/roulette.model';

describe('Roulette Model - Mongoose & Karma Engine', () => {
    it('🟢 doit valider une session de roulette valide avec date d\'expiration (blocage 24h)', () => {
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);

        const validData = {
            uid: 'roulette_123',
            buyerUid: 'bird_99',
            productUid: 'prod_42',
            rolledPriceCents: 500, // L'oiseau a eu de la chance, prix bas !
            wagerAmount: 5, // Il a payé 5 Éclats pour tenter sa chance
            status: 'PENDING',
            expiresAt: tomorrow
        };

        const session = new RouletteModel(validData);
        expect(session.uid).toBe('roulette_123');
        expect(session.buyerUid).toBe('bird_99');
        expect(session.productUid).toBe('prod_42');
        expect(session.rolledPriceCents).toBe(500);
        expect(session.wagerAmount).toBe(5);
        expect(session.status).toBe('PENDING');
        expect(session.expiresAt).toBe(tomorrow);
    });

    it('🔴 doit rejeter une session de roulette si les champs obligatoires manquent', () => {
        const invalidData = {
            status: 'PENDING'
            // buyerUid, productUid, rolledPriceCents, et expiresAt sont manquants
        };

        const error = new RouletteModel(invalidData).validateSync();
        expect(error?.errors?.buyerUid).toBeDefined();
        expect(error?.errors?.productUid).toBeDefined();
        expect(error?.errors?.rolledPriceCents).toBeDefined();
        expect(error?.errors?.expiresAt).toBeDefined();
    });

    it('🔴 doit rejeter une session avec un status non valide', () => {
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);

        const invalidData = {
            buyerUid: 'bird_99',
            productUid: 'prod_42',
            rolledPriceCents: 500,
            expiresAt: tomorrow,
            status: 'HACKED' // État inconnu
        };

        const error = new RouletteModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
    });

    it('🔴 doit rejeter une session si le prix tiré ou la mise sont négatifs (protection Kompta)', () => {
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);

        const invalidData = {
            buyerUid: 'bird_99',
            productUid: 'prod_42',
            rolledPriceCents: -100, // Impossible
            wagerAmount: -5, // Impossible
            expiresAt: tomorrow
        };

        const error = new RouletteModel(invalidData).validateSync();
        expect(error?.errors?.rolledPriceCents).toBeDefined();
        expect(error?.errors?.wagerAmount).toBeDefined();
    });
});