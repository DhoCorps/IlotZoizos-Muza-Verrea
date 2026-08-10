import { describe, it, expect } from 'vitest';
import { SampleModel } from '../../nosql/sample.model'; // Ajuste le chemin relatif selon ton arborescence

describe('Sample Model', () => {
    it('🟢 doit valider un échantillon audio conforme avec toutes ses valeurs requises et par défaut', () => {
        const validData = {
            uid: 'sample_123',
            title: 'Battement Sélénite',
            slug: 'battement-selenite',
            audioUrl: 'https://cdn.ilot.io/samples/selenite.mp3',
            storageKey: 'samples/selenite.mp3',
            tempoBpm: 120,
            musicalKey: 'Cmin',
            style: 'Ambient',
            creatorUid: 'bird_creator_1',
            creatorSlug: 'bird-creator-1',
        };

        const sample = new SampleModel(validData);
        expect(sample.uid).toBe('sample_123');
        expect(sample.title).toBe('Battement Sélénite');
        expect(sample.slug).toBe('battement-selenite');
        expect(sample.audioUrl).toBe('https://cdn.ilot.io/samples/selenite.mp3');
        expect(sample.storageKey).toBe('samples/selenite.mp3');
        expect(sample.tempoBpm).toBe(120);
        expect(sample.musicalKey).toBe('Cmin');
        expect(sample.style).toBe('Ambient');
        expect(sample.creatorUid).toBe('bird_creator_1');
        expect(sample.creatorSlug).toBe('bird-creator-1');
        expect(sample.permissions.allowRadio).toBe(true);      // Valeur par défaut
        expect(sample.permissions.allowBlindTest).toBe(true);  // Valeur par défaut
        expect(sample.permissions.allowShowcase).toBe(true);   // Valeur par défaut
        expect(sample.createdAt).toBeDefined();
    });

    it('🔴 doit rejeter un échantillon si les champs obligatoires (uid, title, slug, audioUrl, storageKey, tempoBpm, musicalKey, style, creatorUid, creatorSlug) manquent', () => {
        const invalidData = {
            // Tous les champs required sont omis
        };

        const error = new SampleModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.title).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
        expect(error?.errors?.audioUrl).toBeDefined();
        expect(error?.errors?.storageKey).toBeDefined();
        expect(error?.errors?.tempoBpm).toBeDefined();
        expect(error?.errors?.musicalKey).toBeDefined();
        expect(error?.errors?.style).toBeDefined();
        expect(error?.errors?.creatorUid).toBeDefined();
        expect(error?.errors?.creatorSlug).toBeDefined();
    });
});