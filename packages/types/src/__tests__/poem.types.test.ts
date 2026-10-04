// packages/types/src/__tests__/poem.types.test.ts
import { describe, it, expect } from 'vitest';
import { PoemSchema } from '../../src/core/poem.types';

describe('Types : PoemSchema (Poetrik)', () => {
  it('🟢 doit valider un poème avec le Voile de Catharsis actif', () => {
    const catharticPoem = {
      authorUid: 'oiseau_456',
      title: 'Résilience silencieuse',
      content: 'Le silence après la tempête.',
      settings: {
        catharsisVeil: true // 🛡️ Bloque les commentaires
      },
      cryptoSeal: {
        copyrightMetadata: {
          role: 'CREATOR',
          isExclusiveIlot: true
        }
      }
    };

    const result = PoemSchema.safeParse(catharticPoem);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.settings.catharsisVeil).toBe(true);
      expect(result.data.cryptoSeal?.copyrightMetadata?.role).toBe('CREATOR');
    }
  });

  it('🟢 doit valider un poème avec un pont audio vers Samplotek', () => {
    const poemWithAudio = {
      authorUid: 'oiseau_789',
      title: 'Symphonie des Mots',
      content: 'Chant et rythme entremêlés.',
      audioAmbiance: {
        trackUrl: 'https://cdn.ilot.com/ambiance-pad.mp3',
        linkedEntityUid: 'sample_999'
      }
    };

    const result = PoemSchema.safeParse(poemWithAudio);
    expect(result.success).toBe(true);
  });
});