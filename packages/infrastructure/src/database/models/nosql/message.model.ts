// packages/infrastructure/src/database/models/message.model.ts
import mongoose from 'mongoose'; 
import type { Document, Model } from 'mongoose';

const { Schema, model } = mongoose;
import { IUniversalAttachment, IMessageReaction, IMessageReadReceipt } from '@ilot/types';

export interface IMessageDocument extends Document {
  slug: string;
  conversationSlug: string;
  senderSlug: string;
  content: string;
  attachments: IUniversalAttachment[];
  replyToSlug?: string;          // Pour structurer les réponses en fil (Threads)
  isEdited: boolean;             // Indique si le message a été modifié après envoi
  reactions: IMessageReaction[]; // Réactions rapides par émojis (ex: ❤️, 🚀, 🪶)
  readBy: IMessageReadReceipt[]; // Suivi granulaire des lectures (Statut Distribué / Lu)
  
  // 🦅 EXTENSIONS PHASE 4 : Newsletters & Snapshots Système
  isSystemBroadcast?: boolean;   // Indique s'il s'agit d'une diffusion globale de la Canopée
  metadata?: Record<string, any>;  // Pour stocker des snapshots de stats ou données de jeu (Renewall)
  
  createdAt: Date;
  updatedAt: Date;
}

const AttachmentSubSchema = new Schema<IUniversalAttachment>({
  sourceType: { type: String, required: true },
  entitySlug: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String },
  thumbnailUrl: { type: String },
  targetRoute: { type: String, required: true }
}, { _id: false });

const ReactionSubSchema = new Schema<IMessageReaction>({
  emoji: { type: String, required: true },
  userSlugs: [{ type: String, required: true }]
}, { _id: false });

const ReadReceiptSubSchema = new Schema<IMessageReadReceipt>({
  userSlug: { type: String, required: true },
  readAt: { type: Date, default: Date.now }
}, { _id: false });

const MessageSchema = new Schema<IMessageDocument>({
  slug: { type: String, required: true, unique: true, index: true },
  conversationSlug: { type: String, required: true, index: true },
  senderSlug: { type: String, required: true, index: true },
  content: { type: String, default: '' },
  attachments: [AttachmentSubSchema],
  replyToSlug: { type: String, index: true, sparse: true },
  isEdited: { type: Boolean, default: false },
  reactions: [ReactionSubSchema],
  readBy: [ReadReceiptSubSchema],
  
  // Nouveaux champs pour la Phase 4 (index: true retiré ici pour éviter le doublon avec le schéma d'index plus bas)
  isSystemBroadcast: { type: Boolean, default: false },
  metadata: { type: Schema.Types.Mixed, default: null }
}, {
  timestamps: true,
  collection: 'messages'
});

// Tri chronologique ultra-rapide par salon basé sur les slugs
MessageSchema.index({ conversationSlug: 1, createdAt: -1 });
MessageSchema.index({ conversationSlug: 1, senderSlug: 1 });
MessageSchema.index({ isSystemBroadcast: 1 }); // Index unique et propre pour cibler rapidement les diffusions système

export const MessageModel: Model<IMessageDocument> = 
  mongoose.models.Message || model<IMessageDocument>('Message', MessageSchema);