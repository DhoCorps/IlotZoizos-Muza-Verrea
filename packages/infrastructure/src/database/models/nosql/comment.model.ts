// packages/infrastructure/src/database/models/nosql/comment.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IComment extends Document {
  commentUid: string;
  targetOwnerUid: string; // L'oiseau propriétaire de la ressource commentée
  targetEntityUid: string; // L'ID de l'entité (Sujet, Partita, Produit, etc.)
  targetLabel: string;     // Le type d'entité ('Sujet', 'Partita', 'Product', etc.)
  authorUid: string;       // L'oiseau qui laisse le commentaire
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommentSchema = new Schema<IComment>({
  commentUid: { type: String, required: true, unique: true },
  targetOwnerUid: { type: String, required: true, index: true },
  targetEntityUid: { type: String, required: true, index: true },
  targetLabel: { type: String, required: true },
  authorUid: { type: String, required: true, index: true },
  content: { type: String, required: true },
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

export const CommentModel = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);