import mongoose, { Schema, Document, Model } from 'mongoose';
import { INotification } from '@ilot/types';

// Omit 'uid' and 'createdAt' from the interface for the document, Mongoose handles _id and timestamps
export interface INotificationDocument extends Omit<INotification, 'uid' | 'createdAt'>, Document {
  uid: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotificationDocument>(
  {
    uid: { 
      type: String, 
      required: true, 
      unique: true,
      default: () => new mongoose.Types.ObjectId().toString() // Fallback si non fourni
    },
    recipientUid: { 
      type: String, 
      required: true 
    },
    senderUid: { 
      type: String, 
      required: false 
    },
    category: { 
      type: String, 
      required: true,
      enum: ['TEXT', 'AUDIO', 'VISUAL', 'SOCIAL', 'SYSTEM', 'DIGEST'],
      default: 'SYSTEM'
    },
    type: { 
      type: String, 
      required: true 
    },
    payload: {
      title: { type: String, required: false },
      message: { type: String, required: true },
      targetUrl: { type: String, required: false },
      targetUid: { type: String, required: false },
      targetType: { type: String, required: false },
      groupedCount: { type: Number, required: false }
    },
    isRead: { 
      type: Boolean, 
      default: false 
    },
    scheduledFor: { 
      type: Date, 
      required: false,
      default: null
    }
  },
  {
    timestamps: true, // Gère createdAt et updatedAt automatiquement
    collection: 'notifications'
  }
);

// ⚡️ Les Index de performance essentiels pour la Canopée
// 1. Pour récupérer rapidement les notifications d'un Oiseau (triées par date)
NotificationSchema.index({ recipientUid: 1, createdAt: -1 });

// 2. Pour identifier rapidement les notifications non lues d'un Oiseau
NotificationSchema.index({ recipientUid: 1, isRead: 1 });

// 3. Le moteur du Digest : Pour trouver vite les notifications "retenues" dont l'heure de libération est atteinte
NotificationSchema.index({ scheduledFor: 1 }, { sparse: true });

export const NotificationModel: Model<INotificationDocument> =
  mongoose.models.Notification || mongoose.model<INotificationDocument>('Notification', NotificationSchema);