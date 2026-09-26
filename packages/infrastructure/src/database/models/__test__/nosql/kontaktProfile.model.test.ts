import { describe, it, expect } from 'vitest';
import { KontaktProfileModel } from '../../nosql/kontaktProfile.model';

describe('KontaktProfile Model (Hybrid, TTRPG & Skeleton Edition)', () => {
    it('🟢 doit valider un profil Kontakt conforme avec toutes ses valeurs requises, par défaut, son portfolio, ses tarifs, ses avis, ses tags et son SEO', () => {
        const validData = {
            uid: 'kontakt_123',
            userUid: 'bird_456',
            professionalTitle: 'Architecte Sélénite',
            slug: 'architecte-selenite',
            archetypeClass: 'Mage Silice',
            portfolioItems: [
                { type: 'GITHUB_REPO', url: 'https://github.com/ilot/core', title: 'Core Repo', tags: ['ts'] }
            ],
            pricing: {
                hourlyRateCents: 6000,
                missionRateCents: 45000,
                currency: 'EUR'
            },
            reviews: [
                { authorUid: 'bird_789', rating: 5, comment: 'Excellente collaboration.', isVerifiedHire: true }
            ],
            tags: ['architecture', 'silice'],
            seo: {
                metaTitle: 'Architecte Sélénite | Kontakt',
                metaDescription: 'Profil d\'architecte spécialiste de la Silice.'
            }
        };

        const profile = new KontaktProfileModel(validData);
        expect(profile.uid).toBe('kontakt_123');
        expect(profile.userUid).toBe('bird_456');
        expect(profile.professionalTitle).toBe('Architecte Sélénite');
        expect(profile.slug).toBe('architecte-selenite');
        expect(profile.archetypeClass).toBe('Mage Silice');
        expect(profile.seniorityYears).toBe(0); // Valeur par défaut
        expect(profile.availabilityStatus).toBe('OPEN_TO_WORK'); // Valeur par défaut
        expect(profile.alignment).toBe('TRUE_NEUTRAL'); // Valeur par défaut
        expect(profile.attributes.force).toBe(10); // Valeur par défaut
        expect(profile.attributes.empathieVoightKampff).toBe(50); // Valeur par défaut
        expect(profile.portfolioItems).toHaveLength(1);
        expect(profile.pricing?.hourlyRateCents).toBe(6000);
        expect(profile.reviews).toHaveLength(1);
        expect(profile.reviews[0].rating).toBe(5);
        expect(profile.tags).toContain('silice');
        expect(profile.seo.metaTitle).toBe('Architecte Sélénite | Kontakt');
        expect(profile.settings.allowDirectContact).toBe(true);
    });

    it('🔴 doit rejeter un profil si les champs obligatoires (uid, userUid, professionalTitle, slug, archetypeClass) manquent', () => {
        const invalidData = {
            seniorityYears: 5,
        };

        const error = new KontaktProfileModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.userUid).toBeDefined();
        expect(error?.errors?.professionalTitle).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.archetypeClass).toBeDefined();
    });

    it('🔴 doit rejeter un profil avec un availabilityStatus non valide par rapport à l\'énumération', () => {
        const invalidData = {
            uid: 'kontakt_789',
            userUid: 'bird_456',
            professionalTitle: 'Test',
            slug: 'test',
            archetypeClass: 'Guerrier',
            availabilityStatus: 'UNKNOWN_STATUS', // Invalide
        };

        const error = new KontaktProfileModel(invalidData).validateSync();
        expect(error?.errors?.availabilityStatus).toBeDefined();
    });

    it('🔴 doit rejeter un profil avec un alignement RPG inconnu', () => {
        const invalidData = {
            uid: 'kontakt_align',
            userUid: 'bird_align',
            professionalTitle: 'Mage Noir',
            slug: 'mage-noir',
            archetypeClass: 'Sorcier',
            alignment: 'CHAOTIC_FUNNY' // Invalide
        };

        const error = new KontaktProfileModel(invalidData).validateSync();
        expect(error?.errors?.alignment).toBeDefined();
    });
});