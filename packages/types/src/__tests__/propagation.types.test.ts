import { describe, it, expect } from 'vitest';
import { ShareEventSchema } from '../models/propagation.types';

describe('Schéma Zod : Propagation (ShareEvent)', () => {
  
  const validBaseShare = {
    uid: '123e4567-e89b-12d3-a456-426614174000',
    sourceUid: '123e4567-e89b-12d3-a456-426614174001',
    artifactUid: '123e4567-e89b-12d3-a456-426614174002',
    artifactType: 'BLOG',
  };

  it('🟢 devrait valider un partage GLOBAL par défaut avec des métriques à zéro', () => {
    // Un partage global n'a pas besoin de receiverUids
    const result = ShareEventSchema.safeParse(validBaseShare);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scope).toBe('GLOBAL');
      expect(result.data.receiverUids).toEqual([]);
      expect(result.data.metrics.merciCount).toBe(0);
      expect(result.data.metrics.returnRatio).toBe(0);
    }
  });

  it('🟢 devrait valider un partage TARGETED si des destinataires sont fournis', () => {
    const targetedShare = {
      ...validBaseShare,
      scope: 'TARGETED',
      receiverUids: [
        '123e4567-e89b-12d3-a456-426614174003',
        '123e4567-e89b-12d3-a456-426614174004'
      ],
      customMessage: 'Écoute cette merveille !'
    };

    const result = ShareEventSchema.safeParse(targetedShare);
    expect(result.success).toBe(true);
  });

  it('🔴 devrait rejeter un partage TARGETED s\'il n\'y a aucun destinataire', () => {
    const invalidTargetedShare = {
      ...validBaseShare,
      scope: 'TARGETED',
      receiverUids: [] // Interdit par le .refine()
    };

    const result = ShareEventSchema.safeParse(invalidTargetedShare);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('Incohérence du Kosmos');
      expect(result.error.issues[0].path).toContain('receiverUids');
    }
  });

  it('🔴 devrait rejeter un partage GLOBAL si des destinataires sont explicitement fournis', () => {
    const invalidGlobalShare = {
      ...validBaseShare,
      scope: 'GLOBAL',
      receiverUids: ['123e4567-e89b-12d3-a456-426614174003'] // Interdit par le .refine()
    };

    const result = ShareEventSchema.safeParse(invalidGlobalShare);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain('receiverUids');
    }
  });

  it('🔴 devrait rejeter un partage si les UID ne sont pas au format UUID', () => {
    const invalidUidShare = {
      ...validBaseShare,
      sourceUid: 'oiseau_pas_uuid' // Invalide
    };

    const result = ShareEventSchema.safeParse(invalidUidShare);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('doit être un UUID valide');
    }
  });
});