// Fichier : packages/infrastructure/src/__tests__/partita.model.test.ts
import { describe, it, expect } from 'vitest';
import { PartitaModel } from '../../nosql/partita.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Partita Model - Intégration SEO, Sceau Cryptographique & Universal Comment', () => {
    it('🟢 doit valider une partita conforme avec toutes ses valeurs requises, SEO, Sceau Cryptographique, Universal Comment et auto-générées', () => {
        const validData = {
            title: 'Symphonie de la Canopée',
            slug: 'symphonie-de-la-canopee',
            content: 'X:1\nT:Symphonie\nK:C',
            authorUid: 'bird_composer_77',
            // 🚀 Intégration du SEO
            seo: {
                metaTitle: 'Symphonie de la Canopée | Tablature',
                metaDescription: 'Partition complète pour basse fretless.'
            },
            // 🚀 Intégration du Sceau Cryptographique Unifié (avec Filiation)
            cryptoSeal: {
                digitalSignature: 'mock-sha256-signature',
                timestampedAt: new Date(),
                sealedByUid: 'bird_composer_77',
                copyrightMetadata: {
                    role: 'SUBLIMATOR',
                    isExclusiveIlot: true,
                    license: 'MIT / Libre Canopée',
                    filiation: {
                        isExternalSource: true,
                        sourceAuthorName: 'Auteur Original',
                        sourceWorkTitle: 'Monolithe Source',
                        claimStatus: 'SHARED',
                        escrowBalance: 0
                    }
                }
            },
            // 🚀 Intégration Universal Comment
            lastCommentedAt: new Date('2026-10-03T15:30:00.000Z')
        };

        const partita = new PartitaModel(validData);
        expect(partita.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(partita.title).toBe('Symphonie de la Canopée');
        expect(partita.slug).toBe('symphonie-de-la-canopee');
        expect(partita.content).toBe('X:1\nT:Symphonie\nK:C');
        expect(partita.authorUid).toBe('bird_composer_77');
        expect(partita.instrument).toBe('BASS'); // Valeur par défaut
        expect(partita.format).toBe('ABC');     // Valeur par défaut
        expect(partita.status).toBe('DRAFT');    // Valeur par défaut
        expect(partita.tuning).toBe('E1-A1-D2-G2');
        
        // 🚀 Vérification des nouveaux blocs (SEO, CryptoSeal & Comment)
        expect(partita.seo?.metaTitle).toBe('Symphonie de la Canopée | Tablature');
        expect(partita.cryptoSeal?.digitalSignature).toBe('mock-sha256-signature');
        expect(partita.cryptoSeal?.copyrightMetadata?.role).toBe('SUBLIMATOR');
        expect(partita.cryptoSeal?.copyrightMetadata?.filiation?.claimStatus).toBe('SHARED');
        expect(partita.lastCommentedAt).toBeInstanceOf(Date);
    });

    it('🔴 doit rejeter une partita si les champs obligatoires racine (title, slug, content, authorUid) manquent', () => {
        const invalidData = {
            tuning: 'DROP-D',
            // Tous les champs required sont omis
        };

        const error = new PartitaModel(invalidData).validateSync();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.content).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
    });

    it('🔴 doit rejeter une partita avec un status ou un format non valide par rapport aux énumérations', () => {
        const invalidData = {
            title: 'Test',
            slug: 'test',
            content: 'ABC',
            authorUid: 'bird_1',
            status: 'UNKNOWN_STATUS', // Invalide
            format: 'UNKNOWN_FORMAT', // Invalide
        };

        const error = new PartitaModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
        expect(error?.errors?.format).toBeDefined();
    });

    it('🐣 doit appliquer un Sceau Cryptographique "undefined" par défaut pour coller au typage', () => {
        const minimalData = {
            title: 'Test Basique',
            slug: 'test-basique',
            content: 'C: E1',
            authorUid: 'bird_1',
        };

        const partita = new PartitaModel(minimalData);
        expect(partita.cryptoSeal).toBeUndefined();
        expect(partita.lastCommentedAt).toBeUndefined();
    });
});