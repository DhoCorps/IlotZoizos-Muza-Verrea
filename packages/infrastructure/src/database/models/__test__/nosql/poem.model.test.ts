// packages/infrastructure/src/database/models/__test__/nosql/poem.model.test.ts
import { describe, it, expect } from 'vitest';
import { PoemModel } from '../../nosql/poem.model';

describe('PoemModel Validation (Atelier Poetrik)', () => {
  it('🟢 doit valider avec succès un poème basique et appliquer les valeurs par défaut', () => {
    const validData = {
      uid: 'poem_12345',
      authorUid: 'bird_99',
      title: 'Les Vents de l\'Îlot',
      content: 'Souffle léger\nSur la canopée.'
    };

    const poem = new PoemModel(validData);
    const validationError = poem.validateSync();
    
    expect(validationError).toBeUndefined();
    expect(poem.uid).toBe('poem_12345');
    expect(poem.authorUid).toBe('bird_99');
    
    // Vérification des valeurs par défaut vitales
    expect(poem.status).toBe('DRAFT'); 
    expect(poem.visibility).toBe('PUBLIC');
    expect(poem.format).toBe('FREE_VERSE'); 
    expect(poem.settings?.catharsisVeil).toBe(false); // Pas de Voile par défaut
  });

  it('🟢 doit valider un poème complexe avec SEO, Sceau Cryptographique et Voile de Catharsis', () => {
    const complexData = {
      uid: 'poem_67890',
      authorUid: 'bird_42',
      title: 'Nuit sans lune',
      content: 'L\'obscurité profonde...',
      format: 'HAIKU',
      seo: {
        metaTitle: 'Haiku Nocturne',
        metaDescription: 'Un poème sur la nuit silencieuse.'
      },
      cryptoSeal: {
        digitalSignature: 'a1b2c3d4e5f6hash',
        timestamp: new Date(),
        copyrightMetadata: { role: 'CREATOR', isExclusiveIlot: true }
      },
      settings: {
        catharsisVeil: true // 🛡️ Activation du sanctuaire silencieux
      },
      audioAmbiance: {
        linkedEntityUid: 'sample_001' // Pont avec SamploTek
      }
    };

    const poem = new PoemModel(complexData);
    const validationError = poem.validateSync();

    expect(validationError).toBeUndefined();
    expect(poem.format).toBe('HAIKU');
    expect(poem.settings?.catharsisVeil).toBe(true);
    expect(poem.cryptoSeal?.digitalSignature).toBe('a1b2c3d4e5f6hash');
    expect(poem.audioAmbiance?.linkedEntityUid).toBe('sample_001');
  });

  it('🔴 doit échouer si les fondations (authorUid, title, content) sont manquantes', () => {
    const invalidData = {
      uid: 'poem_error',
      // authorUid manquant
      title: 'Titre seul',
      // content manquant
    };

    const poem = new PoemModel(invalidData);
    const validationError = poem.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.authorUid).toBeDefined();
    expect(validationError?.errors.content).toBeDefined();
  });
});