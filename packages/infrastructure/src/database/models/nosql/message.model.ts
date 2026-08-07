// packages/infrastructure/src/database/models/message.model.ts
import mongoose, { Document, Model } from 'mongoose';

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
  readBy: [ReadReceiptSubSchema]
}, {
  timestamps: true,
  collection: 'messages'
});

// Tri chronologique ultra-rapide par salon basé sur les slugs
MessageSchema.index({ conversationSlug: 1, createdAt: -1 });
MessageSchema.index({ conversationSlug: 1, senderSlug: 1 });

export const MessageModel: Model<IMessageDocument> = 
  mongoose.models.Message || model<IMessageDocument>('Message', MessageSchema);