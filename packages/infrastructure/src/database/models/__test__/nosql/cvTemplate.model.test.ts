import { describe, it, expect } from 'vitest';
import { CVTemplateModel } from '../../nosql/cvTemplate.model';

describe('CVTemplate Model', () => {
    it('🟢 doit valider un modèle de CV conforme avec tous ses champs et valeurs par défaut', () => {
        const validData = {
            uid: 'cv_temp_123',
            slug: 'architecte-moderne',
            authorUid: 'bird_author_1',
            authorName: 'Aria la Brillante',
            title: 'Modèle Canopée Moderne',
            description: 'Un CV épuré axé sur la clarté.',
            blocks: [{ type: 'header' }, { type: 'skills' }],
        };

        const template = new CVTemplateModel(validData);
        expect(template.uid).toBe('cv_temp_123');
        expect(template.slug).toBe('architecte-moderne');
        expect(template.priceShards).toBe(0);
        expect(template.barterAccepted).toBe(true);
        expect(template.letrinFontFamily).toBe('sans');
    });

    it('🔴 doit rejeter un modèle de CV si les identifiants uniques et requis (uid, slug) manquent', () => {
        const invalidData = {
            title: 'Sans identifiants',
        };

        const error = new CVTemplateModel(invalidData).validateSync();
        expect(error?.errors?.uid).toBeDefined();
        expect(error?.errors?.slug).toBeDefined();
    });
});