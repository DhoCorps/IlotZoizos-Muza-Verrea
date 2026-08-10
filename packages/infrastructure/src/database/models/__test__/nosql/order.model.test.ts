import { describe, it, expect } from 'vitest';
import { OrderModel } from '../../nosql/order.model';

describe('Order Model', () => {
    it('🟢 doit valider une commande conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'order_123',
            buyerUid: 'bird_buyer_1',
            storeUid: 'store_canopee_1',
            items: [
                {
                    productUid: 'prod_99',
                    title: 'Plume Sélénite',
                    priceCents: 1500,
                    quantity: 2,
                }
            ],
            totalAmountCents: 3000,
            stripePaymentIntentId: 'pi_3Mxxxxxx',
        };

        const order = new OrderModel(validData);
        expect(order.uid).toBe('order_123');
        expect(order.buyerUid).toBe('bird_buyer_1');
        expect(order.storeUid).toBe('store_canopee_1');
        expect(order.totalAmountCents).toBe(3000);
        expect(order.stripePaymentIntentId).toBe('pi_3Mxxxxxx');
        expect(order.status).toBe('PENDING');
        expect(order.items).toHaveLength(1);
        expect(order.items[0].productUid).toBe('prod_99');
    });

    it('🔴 doit rejeter une commande si les champs obligatoires (uid, buyerUid, storeUid, totalAmountCents, stripePaymentIntentId) manquent', () => {
        const invalidData = {
            status: 'PAID',
            // Tous les champs required racine (sauf items géré par défaut) sont omis
        };

        const error = new OrderModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.buyerUid).toBeDefined();
        expect(error?.errors?.storeUid).toBeDefined();
        expect(error?.errors?.totalAmountCents).toBeDefined();
        expect(error?.errors?.stripePaymentIntentId).toBeDefined();
    });

    it('🔴 doit rejeter une commande avec un status non valide par rapport à l\'énumération', () => {
        const invalidData = {
            uid: 'order_456',
            buyerUid: 'bird_buyer_1',
            storeUid: 'store_canopee_1',
            items: [{ productUid: 'prod_99', title: 'Test', priceCents: 100, quantity: 1 }],
            totalAmountCents: 100,
            stripePaymentIntentId: 'pi_invalid',
            status: 'UNKNOWN_STATUS', // Invalide
        };

        const error = new OrderModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
    });
});