// Fichier : packages/types/src/__tests__/universalMedia.types.test.ts
import { describe, it, expect } from 'vitest';
import {
  MediaTypeEnum,
  SourceAppEnum,
  UniversalMediaSchema,
  UploadMediaInputSchema
} from '../core/universalMedia.types';
import { EntityTargetEnum } from '../models/common.types';

describe('Schéma Zod : UniversalMediaSchema & SourceAppEnum (SSOT EntityTargetEnum)', () => {
  it('🟢 vérifie que SourceAppEnum pointe directement sur la SSOT EntityTargetEnum', () => {
    expect(SourceAppEnum).toBe(EntityTargetEnum);
    expect(SourceAppEnum.safeParse('PARTITA').success).toBe(true);
    expect(SourceAppEnum.safeParse('SAMPLOTEK').success).toBe(true);
    expect(SourceAppEnum.safeParse('KONTAKT').success).toBe(true);
    expect(SourceAppEnum.safeParse('UNKNOWN').success).toBe(true);
  });

  it('🟢 valide un UniversalMedia complet avec les valeurs par défaut de droits et de provenance', () => {
    const validMedia = {
      creatorUid: 'bird_001',
      creatorSlug: 'oiseau-lyre',
      type: 'AUDIO_TRACK',
      title: { fr: 'Chant de la Canopée', en: 'Canopy Song' },
      fileUrl: 'https://cdn.ilot/audio/chant.mp3',
      mimeType: 'audio/mpeg',
      sizeBytes: 4096000
    };

    const result = UniversalMediaSchema.safeParse(validMedia);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceApp).toBe('UNKNOWN');
      expect(result.data.priceCents).toBe(0);
      expect(result.data.rights.allow_radio).toBe(false);
      expect(result.data.rights.consentForShowcase).toBe(false);
    }
  });

  it('🟢 valide UploadMediaInputSchema avec des métadonnées de studio et une sourceApp issue de EntityTargetEnum', () => {
    const validInput = {
      creatorUid: 'bird_002',
      sourceApp: 'SAMPLOTEK',
      type: 'AUDIO_STEM',
      title: { fr: 'Boucle Basse Fretless' },
      priceCents: 500,
      metadata: {
        isStudioProject: true,
        usedSampleUids: ['smp_1', 'smp_2'],
        permissions: { allowShowcase: true, allowRadio: true },
        bpm: 120
      }
    };

    const result = UploadMediaInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceApp).toBe('SAMPLOTEK');
      expect(result.data.metadata.isStudioProject).toBe(true);
      expect(result.data.metadata.bpm).toBe(120);
    }
  });

  it('🔴 rejète un média si le titre en français est vide ou si sizeBytes est négatif', () => {
    const invalidMedia = {
      creatorUid: 'bird_001',
      type: 'IMAGE',
      title: { fr: '' },
      fileUrl: 'https://cdn.ilot/img.png',
      mimeType: 'image/png',
      sizeBytes: -100
    };

    expect(UniversalMediaSchema.safeParse(invalidMedia).success).toBe(false);
    expect(MediaTypeEnum.safeParse('VIDEO_HOLOGRAM').success).toBe(false);
  });
});