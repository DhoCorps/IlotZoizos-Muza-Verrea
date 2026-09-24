import { describe, it, expect } from 'vitest';
import { RouletteModel } from '../../nosql/roulette.model';

describe('Roulette Model - Mongoose & Karma Engine (Norme Cents)', () => {
    it('🟢 doit valider une session de roulette valide avec date d\'expiration et wagerAmountCents', () => {
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);

        const validData = {
            uid: 'roulette_123',
            buyerUid: 'bird_99',
            productUid: 'prod_42',
            rolledPriceCents: 500, // 5.00 € en centimes
            wagerAmountCents: 500, // 500 centimes de mise
            status: 'PENDING',
            expiresAt: tomorrow
        };

        const session = new RouletteModel(validData);
        expect(session.uid).toBe('roulette_123');
        expect(session.buyerUid).toBe('bird_99');
        expect(session.productUid).toBe('prod_42');
        expect(session.rolledPriceCents).toBe(500);
        expect(session.wagerAmountCents).toBe(500);
        expect(session.status).toBe('PENDING');
        expect(session.expiresAt).toBe(tomorrow);
    });

    it('🔴 doit rejeter une session de roulette si les champs obligatoires manquent', () => {
        const invalidData = {
            status: 'PENDING'
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
            status: 'HACKED'
        };

        const error = new RouletteModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
    });

    it('🔴 doit rejeter une session si le prix tiré ou la mise en centimes sont négatifs', () => {
        const tomorrow = new Date();
        tomorrow.setHours(tomorrow.getHours() + 24);

        const invalidData = {
            buyerUid: 'bird_99',
            productUid: 'prod_42',
            rolledPriceCents: -100,
            wagerAmountCents: -50,
            expiresAt: tomorrow
        };

        const error = new RouletteModel(invalidData).validateSync();
        expect(error?.errors?.rolledPriceCents).toBeDefined();
        expect(error?.errors?.wagerAmountCents).toBeDefined();
    });
});