import { describe, it, expect } from 'vitest';
import { SubscriptionSchema, DigestPreferencesSchema } from '../core/subscription.types';
import { randomUUID } from 'crypto';

describe('🌿 SubscriptionSchema (Canopée Tampon)', () => {
  it('🟢 devrait valider un abonnement standard et appliquer le Digest par défaut à 20h', () => {
    const subscriber = randomUUID();
    const target = randomUUID();

    const payload = {
      subscriberUid: subscriber,
      targetUid: target,
      targetType: 'USER',
    };

    const result = SubscriptionSchema.safeParse(payload);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.digestPreferences.mode).toBe('DIGEST');
      expect(result.data.digestPreferences.digestHour).toBe(20);
    }
  });

  it('🟢 devrait valider un abonnement avec un mode ZEN (Murmure de la Canopée) explicite', () => {
    const payload = {
      subscriberUid: randomUUID(),
      targetUid: randomUUID(),
      targetType: 'BIBLIOTEK',
      digestPreferences: {
        mode: 'ZEN',
      }
    };

    const result = SubscriptionSchema.safeParse(payload);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.digestPreferences.mode).toBe('ZEN');
      // Les valeurs par défaut du sous-schéma s'appliquent pour les champs manquants
      expect(result.data.digestPreferences.digestHour).toBe(20);
    }
  });

  it('🔴 devrait échouer si les UIDs ne sont pas des UUID valides', () => {
    const invalidPayload = {
      subscriberUid: 'invalid-uid',
      targetUid: randomUUID(),
      targetType: 'USER',
    };

    const result = SubscriptionSchema.safeParse(invalidPayload);
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('doit être un UUID valide');
    }
  });

  it('🔴 devrait échouer si la cible est inconnue de la matrice', () => {
    const invalidPayload = {
      subscriberUid: randomUUID(),
      targetUid: randomUUID(),
      targetType: 'INVALID_GHOST_TARGET',
    };

    const result = SubscriptionSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('🔴 devrait échouer si l\'heure du Digest est impossible (ex: 25h00)', () => {
    const invalidPrefs = {
      mode: 'DIGEST',
      digestHour: 25, // Heure hors limite cosmique
    };

    const result = DigestPreferencesSchema.safeParse(invalidPrefs);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Number must be less than or equal to 23');
    }
  });
});