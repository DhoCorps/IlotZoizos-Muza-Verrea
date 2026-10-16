// Fichier : packages/types/src/__tests__/notification.types.test.ts
import { describe, it, expect } from 'vitest';
import { NotificationSchema, NotificationTargetTypeSchema } from '../core/notification.types';
import { EntityTargetEnum } from '../models/common.types';
import { randomUUID } from 'crypto';

describe('🔔 NotificationSchema (Alertes, Canopée Tampon & SSOT EntityTargetEnum)', () => {
  it('🟢 vérifie que NotificationTargetTypeSchema pointe directement sur EntityTargetEnum', () => {
    expect(NotificationTargetTypeSchema).toBe(EntityTargetEnum);
  });

  it('🟢 devrait valider une notification directe (REALTIME) avec les valeurs par défaut et un targetType issu de EntityTargetEnum', () => {
    const payload = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      senderUid: randomUUID(),
      category: 'SOCIAL',
      type: 'NEW_ECHO',
      payload: {
        message: "Un oiseau a répondu à votre monologue dans l'AbyssBlog.",
        targetUrl: "/abyss-blog/monologue-1",
        targetUid: randomUUID(),
        targetType: 'PROJECT'
      }
    };

    const result = NotificationSchema.safeParse(payload);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRead).toBe(false); // Valeur par défaut
      expect(result.data.scheduledFor).toBeUndefined(); // Pas de rétention dans le tampon
      expect(result.data.payload.targetType).toBe('PROJECT');
    }
  });

  it('🟢 devrait valider une notification de type DIGEST avec des dates ISO coercées (Canopée Tampon)', () => {
    const futureDateIso = new Date(new Date().setHours(20, 0, 0, 0)).toISOString(); // Digest planifié pour 20h00 en ISO
    const creationDateIso = new Date().toISOString();

    const payload = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      category: 'DIGEST', // La couleur UI sera un dégradé
      type: 'DAILY_SUMMARY',
      payload: {
        title: "Le Murmure de la Canopée",
        message: "3 nouveaux monologues et 2 samples ont enrichi la constellation aujourd'hui.",
        groupedCount: 5 // On indique à l'UI que c'est une alerte groupée
      },
      scheduledFor: futureDateIso, // 🌿 Chaîne ISO pour tester la coercition
      createdAt: creationDateIso
    };

    const result = NotificationSchema.safeParse(payload);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledFor).toBeInstanceOf(Date); // ⏳ Prouve que le coerce fonctionne
      expect(result.data.scheduledFor?.toISOString()).toBe(futureDateIso);
      expect(result.data.createdAt).toBeInstanceOf(Date);
      expect(result.data.createdAt?.toISOString()).toBe(creationDateIso);
      expect(result.data.payload.groupedCount).toBe(5);
    }
  });

  it('🔴 devrait échouer si le payload n\'a pas de message (champ vital) ou si targetType est invalide', () => {
    const invalidPayload = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      category: 'TEXT',
      type: 'NEW_PUBLICATION',
      payload: {
        title: "Nouveau livre dans la Bibliotek" // Il manque le message explicatif
      }
    };

    const result = NotificationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].message).toContain('Le message de l\'alerte ne peut être vide');
    }

    const invalidTargetTypePayload = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      category: 'SOCIAL',
      type: 'NEW_ECHO',
      payload: {
        message: "Alerte valide",
        targetType: "CIBLE_INCONNUE"
      }
    };
    expect(NotificationSchema.safeParse(invalidTargetTypePayload).success).toBe(false);
  });

  it('🔴 devrait échouer si les UIDs d\'expédition ou de réception sont corrompus', () => {
    const invalidPayload = {
      uid: 'fake-uid-123',
      recipientUid: 'not-a-uuid',
      type: 'SYSTEM_ALERT',
      payload: {
        message: "Une anomalie détectée dans la matrice."
      }
    };

    const result = NotificationSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Zod devrait lever au moins 2 erreurs pour les UIDs mal formatés
      expect(result.error.errors.length).toBeGreaterThanOrEqual(2);
    }
  });
});