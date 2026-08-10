import { describe, it, expect } from 'vitest';
import { WalletModel } from '../../nosql/wallet.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Wallet Model', () => {
    it('🟢 doit valider un portefeuille conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            userId: 'bird_user_123',
        };

        const wallet = new WalletModel(validData);
        expect(wallet.userId).toBe('bird_user_123');
        expect(wallet.balance).toBe(0);         // Valeur par défaut
        expect(wallet.currency).toBe('EUR');    // Valeur par défaut
        expect(wallet.linkedAccounts).toEqual([]); // Tableau vide par défaut
    });

    it('🔴 doit rejeter un portefeuille si le champ obligatoire (userId) manque', () => {
        const invalidData = {
            balance: 100,
            // userId est omis
        };

        const error = new WalletModel(invalidData).validateSync();
        expect(error?.errors?.userId).toBeDefined();
    });

    it('🔴 doit rejeter un compte lié si son champ obligatoire (providerId) manque dans le sous-schéma', () => {
        const invalidData = {
            userId: 'bird_user_123',
            linkedAccounts: [
                {
                    brand: 'Visa',
                    // providerId est omis
                }
            ]
        };

        const error = new WalletModel(invalidData).validateSync();
        expect(error?.errors?.['linkedAccounts.0.providerId']).toBeDefined();
    });
});