import { describe, it, expect } from 'vitest';
import { NotificationSchema } from '../core/notification.types';
import { randomUUID } from 'crypto';

describe('🔔 NotificationSchema (Alertes & Canopée Tampon)', () => {
  it('🟢 devrait valider une notification directe (REALTIME) avec les valeurs par défaut', () => {
    const payload = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      senderUid: randomUUID(),
      category: 'SOCIAL',
      type: 'NEW_ECHO',
      payload: {
        message: "Un oiseau a répondu à votre monologue dans l'AbyssBlog.",
        targetUrl: "/abyss-blog/monologue-1"
      }
    };

    const result = NotificationSchema.safeParse(payload);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isRead).toBe(false); // Valeur par défaut
      expect(result.data.scheduledFor).toBeUndefined(); // Pas de rétention dans le tampon
    }
  });

  it('🟢 devrait valider une notification de type DIGEST avec une date de libération (Canopée Tampon)', () => {
    const futureDate = new Date();
    futureDate.setHours(20, 0, 0, 0); // Digest planifié pour 20h00 ce soir

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
      scheduledFor: futureDate // 🌿 Retenue dans la Canopée jusqu'à l'heure H
    };

    const result = NotificationSchema.safeParse(payload);
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.scheduledFor).toEqual(futureDate);
      expect(result.data.payload.groupedCount).toBe(5);
    }
  });

  it('🔴 devrait échouer si le payload n\'a pas de message (champ vital)', () => {
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