// Fichier : packages/types/src/__tests__/cryptoSeal.types.test.ts

import { describe, it, expect } from 'vitest';
import { CryptographicSealSchema } from '../core/cryptoSeal.types';

describe('Schéma Zod : CryptographicSealSchema (Ultimate Edition)', () => {
  
  it('🟢 doit valider un sceau cryptographique basique', () => {
    const validBasicSeal = {
      digitalSignature: '8f43b79b3249a0c8672198...',
      timestampedAt: new Date().toISOString(),
      sealedByUid: 'bird_crypto_1'
    };

    const result = CryptographicSealSchema.safeParse(validBasicSeal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.digitalSignature).toBeDefined();
      expect(result.data.timestampedAt).toBeInstanceOf(Date);
      expect(result.data.copyrightMetadata).toBeUndefined(); // Optionnel par défaut
    }
  });

  it('🟢 doit valider un sceau intégrant le Pacte de Filiation (Sublimation)', () => {
    const richSeal = {
      digitalSignature: 'abc123hash...',
      timestampedAt: new Date(),
      copyrightMetadata: {
        role: 'SUBLIMATOR',
        originalAuthor: 'Léonard de Vinci',
        filiation: {
          isExternalSource: true,
          sourceAuthorName: 'Léonard de Vinci',
          sourceWorkTitle: 'L Homme de Vitruve',
          claimStatus: 'SHARED',
          escrowBalance: 0
        }
      }
    };

    const result = CryptographicSealSchema.safeParse(richSeal);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.copyrightMetadata?.role).toBe('SUBLIMATOR');
      expect(result.data.copyrightMetadata?.filiation?.sourceWorkTitle).toBe('L Homme de Vitruve');
    }
  });

  it('🔴 doit rejeter un sceau si le hash de la signature est manquant', () => {
    const invalidSeal = {
      timestampedAt: new Date(),
    };

    const result = CryptographicSealSchema.safeParse(invalidSeal);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('digitalSignature');
    }
  });
});