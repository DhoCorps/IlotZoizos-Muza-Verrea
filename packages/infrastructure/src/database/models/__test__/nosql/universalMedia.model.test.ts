import { describe, it, expect } from 'vitest';
import { UniversalMediaModel } from '../../nosql/universalMedia.model'; // Ajuste le chemin relatif selon ton arborescence

describe('UniversalMedia Model', () => {
    it('🟢 doit valider un média universel conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            mediaId: 'media_123',
            sourceApp: 'PARTITA',
            ownerUid: 'bird_owner_1',
            ownerSlug: 'bird-owner-1',
            title: 'Symphonie Sélénite',
            mediaUrl: 'https://cdn.ilot.io/media/symphonie.mp3',
        };

        const media = new UniversalMediaModel(validData);
        expect(media.mediaId).toBe('media_123');
        expect(media.sourceApp).toBe('PARTITA');
        expect(media.ownerUid).toBe('bird_owner_1');
        expect(media.ownerSlug).toBe('bird-owner-1');
        expect(media.title).toBe('Symphonie Sélénite');
        expect(media.mediaUrl).toBe('https://cdn.ilot.io/media/symphonie.mp3');
        expect(media.priceCents).toBe(0);           // Valeur par défaut
        expect(media.consentForShowcase).toBe(false); // Valeur par défaut
        expect(media.consentForMusicSync).toBe(false); // Valeur par défaut
    });

    it('🔴 doit rejeter un média si les champs obligatoires (mediaId, sourceApp, ownerUid, ownerSlug, title, mediaUrl) manquent', () => {
        const invalidData = {
            priceCents: 100,
            // Tous les champs required sont omis
        };

        const error = new UniversalMediaModel(invalidData).validateSync();
        expect(error?.errors?.mediaId).toBeDefined();
        expect(error?.errors?.sourceApp).toBeDefined();
        expect(error?.errors?.ownerUid).toBeDefined();
        expect(error?.errors?.ownerSlug).toBeDefined();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.mediaUrl).toBeDefined();
    });

    it('🔴 doit rejeter un média avec un sourceApp non valide par rapport à l\'énumération', () => {
        const invalidData = {
            mediaId: 'media_456',
            sourceApp: 'UNKNOWN_APP', // Invalide
            ownerUid: 'bird_1',
            ownerSlug: 'bird-1',
            title: 'Test',
            mediaUrl: 'https://test.com',
        };

        const error = new UniversalMediaModel(invalidData).validateSync();
        expect(error?.errors?.sourceApp).toBeDefined();
    });
});