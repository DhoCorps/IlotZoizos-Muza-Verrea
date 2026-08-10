import { describe, it, expect } from 'vitest';
import { KontaktProfileModel } from '../../nosql/kontaktProfile.model'; // Ajuste le chemin relatif selon ton arborescence

describe('KontaktProfile Model', () => {
    it('🟢 doit valider un profil Kontakt conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'kontakt_123',
            userUid: 'bird_456',
            professionalTitle: 'Architecte Sélénite',
            slug: 'architecte-selenite',
            archetypeClass: 'Mage Silice',
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
    });

    it('🔴 doit rejeter un profil si les champs obligatoires (uid, userUid, professionalTitle, slug, archetypeClass) manquent', () => {
        const invalidData = {
            seniorityYears: 5,
            // Tous les champs required sont omis
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
});