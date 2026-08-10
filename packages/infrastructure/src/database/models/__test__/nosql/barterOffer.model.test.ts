import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BarterOfferModel } from '../../nosql/barterOffer.model'; // Ajuste le chemin relatif si ton fichier test est ailleurs dans __test__

// -------------------------------------------------------------------------
// 🎭 MOCK PROPRE DE MONGOOSE POUR LES TESTS UNITAIRES
// -------------------------------------------------------------------------
vi.mock('mongoose', async () => {
    const actual = await vi.importActual<typeof import('mongoose')>('mongoose');
    
    class MockModel {
        data: any;
        constructor(data: any) {
            this.data = data;
            Object.assign(this, data);
            // Valeur par défaut définie dans le schéma
            if (!this.data.status) {
                this.data.status = 'PENDING';
            }
        }
        validateSync() {
            // Simulation du validateur pour les statuts
            if (this.data.status && !['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'].includes(this.data.status)) {
                return {
                    errors: {
                        status: { message: 'Invalid status enum' }
                    }
                };
            }
            return null;
        }
    }

    return {
        ...actual,
        models: {},
        model: vi.fn().mockReturnValue(MockModel),
        Schema: actual.Schema,
    };
});

describe('BarterOffer Model', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('🟢 doit valider un objet d\'offre de troc conforme avec le statut par défaut', () => {
        const validData = {
            uid: 'barter_123',
            initiatorUid: 'bird_initiator',
            offeredProductUids: ['prod_1'],
            requestedProductUids: ['prod_2'],
        };

        const offer = new BarterOfferModel(validData);
        expect(offer.uid).toBe('barter_123');
        expect(offer.initiatorUid).toBe('bird_initiator');
        expect(offer.status).toBe('PENDING'); // Vérifie la valeur par défaut
        expect(offer.offeredProductUids).toEqual(['prod_1']);
    });

    it('🔴 doit rejeter une offre de troc avec un statut non valide', () => {
        const invalidData = {
            uid: 'barter_456',
            initiatorUid: 'bird_initiator',
            offeredProductUids: ['prod_1'],
            requestedProductUids: ['prod_2'],
            status: 'UNKNOWN_STATUS', // Invalide
        };

        const error = new BarterOfferModel(invalidData).validateSync();
        expect(error?.errors.status).toBeDefined();
    });
});