// Fichier : packages/types/src/__tests__/moderation.types.test.ts
import { describe, it, expect } from 'vitest';
import {
  ModerationRequestSchema,
  ModerationResponseSchema,
  ModerationTargetTypeSchema
} from '../models/moderation.types';
import { EntityTargetEnum } from '../models/common.types';

describe('Schémas Zod : Modération & Bien-être Mental (SSOT EntityTargetEnum)', () => {
  it('🟢 vérifie que ModerationTargetTypeSchema pointe directement sur EntityTargetEnum', () => {
    expect(ModerationTargetTypeSchema).toBe(EntityTargetEnum);
  });

  it('🟢 valide une requête de modération sur USER, FRAGMENT, PROJECT ainsi que sur toute entité de la SSOT (ex: COMMENT, PRODUCT)', () => {
    const targets = ['USER', 'FRAGMENT', 'PROJECT', 'COMMENT', 'PRODUCT', 'SAMPLE'] as const;

    for (const targetType of targets) {
      const request = {
        targetId: `target_${targetType.toLowerCase()}_01`,
        targetType,
        reason: 'Dérive vibratoire détectée dans la Canopée.',
        severity: 'HIGH',
        reportedBy: 'bird_guardian'
      };

      const result = ModerationRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    }
  });

  it('🔴 rejète une requête de modération si la raison fait moins de 5 caractères ou si la cible est invalide', () => {
    const tooShortReason = {
      targetId: 'user_123',
      targetType: 'USER',
      reason: 'Non',
      severity: 'LOW'
    };
    expect(ModerationRequestSchema.safeParse(tooShortReason).success).toBe(false);

    const invalidTarget = {
      targetId: 'user_123',
      targetType: 'ENTITE_FANTOME',
      reason: 'Raison suffisamment détaillée.',
      severity: 'MEDIUM'
    };
    expect(ModerationRequestSchema.safeParse(invalidTarget).success).toBe(false);
  });

  it('🟢 valide une réponse de modération complète (ModerationResponseSchema)', () => {
    const response = {
      success: true,
      actionTaken: 'WARN',
      ticketId: 'ticket_001',
      message: 'Avertissement transmis avec bienveillance.',
      timestamp: new Date().toISOString(),
      flagged: true
    };

    expect(ModerationResponseSchema.safeParse(response).success).toBe(true);
  });
});