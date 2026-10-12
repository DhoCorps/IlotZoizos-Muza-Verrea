// Fichier : packages/types/src/__tests__/univershall.types.test.ts
import { describe, it, expect } from 'vitest';
import {
  IAgoraBeacon,
  AgoraModuleSource,
  AgoraModuleSourceSchema,
  AgoraBeaconSchema
} from '../models/univershall.types';
import { EntityTargetEnum } from '../models/common.types';

describe('Types & Schémas : UniversHall (IAgoraBeacon & SSOT EntityTargetEnum)', () => {
  it('🟢 vérifie que AgoraModuleSourceSchema pointe directement sur la SSOT EntityTargetEnum', () => {
    expect(AgoraModuleSourceSchema).toBe(EntityTargetEnum);

    const historicalModules: AgoraModuleSource[] = [
      'POETRIK',
      'BIBLIOTEK',
      'PARTITA',
      'LETRIN',
      'SAMPLOTEK',
      'ABYSS'
    ];

    for (const mod of historicalModules) {
      expect(AgoraModuleSourceSchema.safeParse(mod).success).toBe(true);
    }
  });

  it('🟢 valide la structure complète d’une balise IAgoraBeacon et du schéma AgoraBeaconSchema', () => {
    const mockBeacon: IAgoraBeacon = {
      uid: 'beacon_poet_123',
      sourceModule: 'POETRIK',
      entityUid: 'poem_456',
      title: 'Ode à la Silice',
      slug: 'ode-a-la-silice',
      authorUid: 'bird_001',
      authorSlug: 'vaelen',
      summary: 'Sous les branches de néon...',
      tags: ['poésie', 'cyberpunk'],
      resonanceScore: 42,
      metadata: { format: 'SONNET', syllableCount: 12 },
      createdAt: new Date()
    };

    const result = AgoraBeaconSchema.safeParse(mockBeacon);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.sourceModule).toBe('POETRIK');
      expect(result.data.resonanceScore).toBe(42);
    }
  });

  it('🔴 rejète une balise dont le sourceModule est inconnu de EntityTargetEnum', () => {
    const invalidBeacon = {
      uid: 'beacon_err',
      sourceModule: 'MODULE_INEXISTANT',
      entityUid: 'ent_1',
      title: 'Test',
      slug: 'test',
      authorUid: 'bird_1',
      authorSlug: 'bird'
    };

    expect(AgoraBeaconSchema.safeParse(invalidBeacon).success).toBe(false);
  });
});