import { NotificationModel } from '@ilot/infrastructure';
import { INotification, ActionSignature } from '@ilot/types';
import { TransactionManager } from './transactionManager';
import { IlotError } from '../errors/ilot.errors';
import { randomUUID } from 'crypto';

export type FosterNotificationPayload = {
  recipientUid: string;
  senderUid?: string;
  category: 'TEXT' | 'AUDIO' | 'VISUAL' | 'SOCIAL' | 'SYSTEM' | 'DIGEST';
  type: string;
  payload: {
    title?: string;
    message: string;
    targetUrl?: string;
    targetUid?: string;
    targetType?: string;
  };
};

export interface NotificationSyncResult {
  success: boolean;
  status: string;
  mongo: INotification | null;
  neo4j: import('neo4j-driver').QueryResult | null;
  isGrouped?: boolean;
}

/**
 * 🔔 NOTIFICATION ORCHESTRATOR
 * Gardien de la Canopée Tampon et de l'Écho Intelligent.
 */
export class NotificationOrchestrator {
  
  /**
   * 🌬️ SOUFFLER UN ÉCHO (Créer ou Grouper une Notification)
   */
  async fosterNotification(data: FosterNotificationPayload, signature: ActionSignature): Promise<NotificationSyncResult> {
    // Si l'alerte provient d'une action humaine, on vérifie l'identité
    if (data.senderUid && data.senderUid !== signature.actorUid && !signature.capabilities.includes('*')) {
      throw new IlotError("L'Oiseau ne peut pas siffler avec le bec d'un autre.", "FORBIDDEN", 403);
    }

    return await TransactionManager.execute("Souffle de Notification", async (mongoSession, neo4jTx) => {
      let mode = 'REALTIME';
      let digestHour = 20;

      // 1. Consulter le Graphe (Neo4j) pour connaître la préférence de réception de l'Oiseau
      if (data.senderUid) {
        const neoResult = await neo4jTx.run(`
          MATCH (recipient:Oiseau { uid: $recipientUid })-[r:FOLLOWS]->(sender { uid: $senderUid })
          RETURN r.mode AS mode, r.digestHour AS digestHour
        `, { recipientUid: data.recipientUid, senderUid: data.senderUid });

        if (neoResult.records.length > 0) {
          mode = neoResult.records[0].get('mode') || 'DIGEST';
          digestHour = neoResult.records[0].get('digestHour') || 20;
        }
      }

      // 2. L'Écho Intelligent (Regroupement si mode DIGEST)
      if (mode === 'DIGEST' || mode === 'ZEN') {
        const existingGroup = await NotificationModel.findOneAndUpdate(
          {
            recipientUid: data.recipientUid,
            senderUid: data.senderUid,
            category: data.category,
            type: data.type,
            isRead: false
          },
          {
            $inc: { 'payload.groupedCount': 1 },$set: { 
              'payload.message': "Plusieurs échos résonnent dans cette constellation...",
              updatedAt: new Date()
            }
          },
          { session: mongoSession, new: true }
        ).lean() as unknown as INotification;

        if (existingGroup) {
          // L'alerte a été absorbée par une carte existante, on ne crée rien de plus !
          return { success: true, status: 'grouped', mongo: existingGroup, neo4j: null, isGrouped: true };
        }
      }

      // 3. La Canopée Tampon : Calcul de l'heure de libération
      let scheduledFor: Date | null = null;
      if (mode === 'DIGEST' || mode === 'ZEN') {
        const now = new Date();
        scheduledFor = new Date(now);
        
        // Mode ZEN repousse toujours au lendemain matin 8h. Mode DIGEST respecte l'heure choisie.
        const targetHour = mode === 'ZEN' ? 8 : digestHour;
        scheduledFor.setHours(targetHour, 0, 0, 0);
        
        // Si l'heure est déjà passée aujourd'hui, on repousse à demain
        if (now.getHours() >= targetHour) {
          scheduledFor.setDate(scheduledFor.getDate() + 1);
        }
      }

      // 4. L'Écriture dans la Silice (MongoDB)
      const newNotificationData = {
        uid: randomUUID(),
        ...data,
        isRead: false,
        scheduledFor,
        payload: {
          ...data.payload,
          groupedCount: 1 // Base pour l'Écho Intelligent
        }
      };

      const created = await NotificationModel.create([newNotificationData], { session: mongoSession });
      const mongoNotif = created[0] as unknown as INotification;

      return { success: true, status: 'created', mongo: mongoNotif, neo4j: null, isGrouped: false };
    });
  }

  /**
   * 👁️ APAISER LES ÉCHOS (Marquer comme lu)
   */
  async markAsRead(notificationUids: string[], signature: ActionSignature): Promise<{ success: boolean; modifiedCount: number }> {
    return await TransactionManager.execute("Apaisement des Notifications", async (mongoSession) => {
      const result = await NotificationModel.updateMany(
        { uid: { $in: notificationUids }, recipientUid: signature.actorUid },
        { $set: { isRead: true } },
        { session: mongoSession }
      );

      return { success: true, modifiedCount: result.modifiedCount };
    });
  }
}