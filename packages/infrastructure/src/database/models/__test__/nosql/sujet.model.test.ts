import { describe, it, expect } from 'vitest';
import { SujetModel } from '../../nosql/sujet.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Sujet Model (Ultimate Edition - SEO & Cross-Links)', () => {
    
    it('🟢 doit valider un sujet conforme avec toutes ses valeurs requises, par défaut et auto-générées', () => {
        const validData = {
            title: 'Le Chant des Sélénites',
            slug: 'le-chant-des-selenites',
            content: 'Réflexion profonde sur la nature de la Silice et de la Canopée.',
            authorUid: 'bird_writer_77',
        };

        const sujet = new SujetModel(validData);
        expect(sujet.uid).toBeDefined(); // Auto-généré par uuidv4()
        expect(sujet.title).toBe('Le Chant des Sélénites');
        expect(sujet.slug).toBe('le-chant-des-selenites');
        expect(sujet.content).toBe('Réflexion profonde sur la nature de la Silice et de la Canopée.');
        expect(sujet.authorUid).toBe('bird_writer_77');
        expect(sujet.category).toBe('MONOLOGUE'); // Valeur par défaut
        expect(sujet.status).toBe('DRAFT');      // Valeur par défaut
        expect(sujet.readingTimeMinutes).toBe(1); // Valeur par défaut
        expect(sujet.settings.allowComments).toBe(true); // Valeur par défaut du sous-objet
        expect(sujet.connections.crossLinks).toEqual([]);
    });

    it('🔴 doit rejeter un sujet si les champs obligatoires (title, slug, content, authorUid) manquent', () => {
        const invalidData = {
            lyrics: 'Paroles isolées sans en-tête',
        };

        const error = new SujetModel(invalidData).validateSync();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.content).toBeDefined();
        expect(error?.errors?.authorUid).toBeDefined();
    });

    it('🔴 doit rejeter un sujet avec un status ou une catégorie non valide par rapport aux énumérations', () => {
        const invalidData = {
            title: 'Test',
            slug: 'test',
            content: 'Contenu',
            authorUid: 'bird_1',
            status: 'UNKNOWN_STATUS',    // Invalide
            category: 'UNKNOWN_CATEGORY', // Invalide
        };

        const error = new SujetModel(invalidData).validateSync();
        expect(error?.errors?.status).toBeDefined();
        expect(error?.errors?.category).toBeDefined();
    });

    it('🟢 doit valider un sujet riche intégrant le SEO, les cross-links, la date de publication et les attributs média', () => {
        const richData = {
            title: 'Chronique des Profondeurs',
            slug: 'chronique-des-profondeurs',
            subtitle: 'Une exploration des flux asynchrones',
            excerpt: 'Résumé court pour les cartes du flux.',
            content: 'Corps du texte...',
            authorUid: 'bird_1',
            readingTimeMinutes: 4,
            publishedAt: new Date('2026-06-06T12:00:00.000Z'), // Test de la date éditoriale native
            seo: {
                metaTitle: 'Chronique des Profondeurs | Îlot',
                metaDescription: 'Plonge dans ce monologue inédit au cœur de l’Îlot Zoizos.',
                canonicalUrl: 'https://ilot-zoizos.com/abyss-blog/chronique-des-profondeurs'
            },
            connections: {
                relatedProjects: ['proj-1'],
                crossLinks: [
                    { entityType: 'FONT', entityId: 'font-1', label: 'Letr\'In' }
                ]
            },
            media: {
                coverImageUrl: 'https://cdn.ilot/cover.jpg',
                coverImageAlt: 'Illustration cybernétique de l\'Abysse'
            },
            settings: {
                alchemicalTransmuted: true
            }
        };

        const sujet = new SujetModel(richData);
        const error = sujet.validateSync();
        expect(error).toBeUndefined();
        expect(sujet.readingTimeMinutes).toBe(4);
        expect(sujet.publishedAt).toBeInstanceOf(Date);
        expect(sujet.seo.metaTitle).toBe('Chronique des Profondeurs | Îlot');
        expect(sujet.connections.crossLinks).toHaveLength(1);
        expect(sujet.connections.crossLinks[0].entityType).toBe('FONT');
        expect(sujet.media?.coverImageAlt).toBeDefined();
        expect(sujet.settings.alchemicalTransmuted).toBe(true);
    });

    it('🔴 doit rejeter un crossLink si son entityType est invalide', () => {
        const invalidCrossLinkData = {
            title: 'Test CrossLink',
            slug: 'test-crosslink',
            content: 'Contenu',
            authorUid: 'bird_1',
            connections: {
                crossLinks: [
                    { entityType: 'INVALID_TYPE', entityId: '123' } // Type non autorisé dans l'Enum
                ]
            }
        };

        const error = new SujetModel(invalidCrossLinkData).validateSync();
        expect(error?.errors?.['connections.crossLinks.0.entityType']).toBeDefined();
    });
});