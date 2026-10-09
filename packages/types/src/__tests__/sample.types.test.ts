// packages/types/src/__tests__/samplotek.types.test.ts

import { describe, it, expect } from 'vitest';
import { SampleSchema, StudioProjectSchema } from '../models/sample.types';

describe('Zod Schemas : SamploTek', () => {
  it('🟢 SampleSchema : doit valider un sample et appliquer les valeurs par défaut (SEO, Moderation)', () => {
    const rawData = {
      uid: 'samp_123',
      title: 'Kick Cyberpunk',
      slug: 'kick-cyberpunk',
      audioUrl: 'https://cdn.ilot.zoizos/samp_123.wav',
      storageKey: 'samplotek/samp_123.wav',
      authorUid: 'user_456',
      cryptoSeal: {
        digitalSignature: 'sha256-abc123def456',
        timestampedAt: new Date(),
        copyrightMetadata: {
          role: 'CREATOR',
          isExclusiveIlot: true,
          license: 'STANDARD'
        }
      }
    };

    const parsed = SampleSchema.parse(rawData);

    // Vérification des données transmises
    expect(parsed.uid).toBe('samp_123');
    expect(parsed.title).toBe('Kick Cyberpunk');
    expect(parsed.cryptoSeal?.digitalSignature).toBe('sha256-abc123def456');
    expect(parsed.cryptoSeal?.copyrightMetadata?.role).toBe('CREATOR');

    // Vérification de la robustesse des valeurs par défaut Zod
    expect(parsed.tempoBpm).toBe(120);
    expect(parsed.musicalKey).toBe('C major');
    expect(parsed.status).toBe('PUBLISHED');
    expect(parsed.moderation.isQuarantined).toBe(false);
    expect(parsed.permissions.allowRadio).toBe(true);
    expect(parsed.seo).toBeDefined();
  });

  it('🟢 StudioProjectSchema : doit valider un projet, ses pistes FX, et son Voile de Catharsis', () => {
    const rawProject = {
      uid: 'proj_789',
      title: 'Aube Numérique',
      slug: 'aube-numerique',
      authorUid: 'user_456',
      tracks: [
        {
          id: 1,
          name: 'Beat 1',
          volume: 0.9,
        }
      ],
      settings: {
        snapToGrid: true,
        quantization: '1/8',
        allowComments: false
      }
    };

    const parsedProject = StudioProjectSchema.parse(rawProject);

    expect(parsedProject.title).toBe('Aube Numérique');
    expect(parsedProject.tracks[0].isLocked).toBe(false);
    expect(parsedProject.tracks[0].steps).toHaveLength(16);
    expect(parsedProject.tracks[0].fx.reverb).toBe(0);
    expect(parsedProject.settings.allowComments).toBe(false);
  });

  it('🔴 SampleSchema : doit rejeter un sample si les données requises manquent', () => {
    const invalidData = {
      title: 'Ghost Sample'
    };

    const result = SampleSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
    
    if (!result.success) {
      expect(result.error.issues.map(i => i.path[0])).toContain('uid');
      expect(result.error.issues.map(i => i.path[0])).toContain('audioUrl');
    }
  });
});