import { describe, it, expect } from 'vitest';
import { NotificationModel } from '../../nosql/notification.model';
import mongoose from 'mongoose';
import { randomUUID } from 'crypto';

describe('🗄️ NotificationModel (Persistance Mongoose)', () => {
  
  it('🟢 devrait créer un modèle de notification valide (REALTIME)', () => {
    const validData = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      category: 'SOCIAL',
      type: 'NEW_FOLLOWER',
      payload: {
        message: 'Un nouvel Oiseau s\'est perché sur votre branche.'
      }
    };

    const notification = new NotificationModel(validData);
    const validationError = notification.validateSync();

    expect(validationError).toBeUndefined();
    expect(notification.isRead).toBe(false); // Valeur par défaut
    expect(notification.scheduledFor).toBeNull(); // Pas de rétention
  });

  it('🟢 devrait créer un modèle de notification valide (DIGEST Canopée Tampon)', () => {
    const futureDate = new Date();
    futureDate.setHours(futureDate.getHours() + 5);

    const digestData = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      category: 'DIGEST',
      type: 'DAILY_SUMMARY',
      payload: {
        title: 'Le Murmure de la Canopée',
        message: 'Voici vos échos du jour.',
        groupedCount: 3
      },
      scheduledFor: futureDate // Date de libération configurée
    };

    const notification = new NotificationModel(digestData);
    const validationError = notification.validateSync();

    expect(validationError).toBeUndefined();
    expect(notification.scheduledFor).toEqual(futureDate);
  });

  it('🔴 devrait échouer si le champ obligatoire recipientUid est manquant', () => {
    const invalidData = {
      uid: randomUUID(),
      category: 'TEXT',
      type: 'NEW_PUBLICATION',
      payload: {
        message: 'Une anomalie sans destinataire.'
      }
    };

    const notification = new NotificationModel(invalidData);
    const validationError = notification.validateSync();

    expect(validationError).toBeDefined();
    expect(validationError?.errors.recipientUid).toBeDefined();
  });

  it('🔴 devrait échouer si le payload ne contient pas de message', () => {
    const invalidData = {
      uid: randomUUID(),
      recipientUid: randomUUID(),
      category: 'SYSTEM',
      type: 'ALERT',
      payload: {
        title: 'Erreur système' 
        // message est manquant
      }
    };

    const notification = new NotificationModel(invalidData);
    const validationError = notification.validateSync();

    expect(validationError).toBeDefined();
    // En Mongoose, on vérifie avec la clé en pointillée pour les objets imbriqués
    expect(validationError?.errors['payload.message']).toBeDefined();
  });
});