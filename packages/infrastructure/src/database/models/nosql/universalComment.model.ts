import mongoose, { Schema, Document } from 'mongoose';
import { UniversalComment, CommentTargetTypeSchema } from '@ilot/types'; 

export interface IUniversalComment extends Omit<UniversalComment, 'createdAt' | 'updatedAt'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const UniversalCommentSchema: Schema = new Schema(
  {
    uid: { type: String, required: true, unique: true },
    authorUid: { type: String, required: true, index: true },
    targetUid: { type: String, required: true },
    targetType: { 
      type: String, 
      required: true,
      // Import dynamique de l'Enum depuis Zod pour maintenir la source de vérité unique
      enum: CommentTargetTypeSchema.options 
    },
    parentId: { type: String, required: false },
    content: { type: String, required: true },
    allowComments: { type: Boolean, default: true },
    allowReactions: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false },
    isScholarSealed: { type: Boolean, default: false }, // Le Sceau de l'Érudit pour l'extraction SEO
  },
  { 
    timestamps: true 
  }
);

// Index de performance absolus pour les lectures fréquentes :
// 1. Pour le Tiroir : Trouver vite tous les commentaires d'une œuvre précise
UniversalCommentSchema.index({ targetType: 1, targetUid: 1 });

// 3. Pour reconstruire l'arbre des réponses : Trouver vite les enfants d'un commentaire
UniversalCommentSchema.index({ parentId: 1 });

// 4. Index conditionnel SEO : Trouver instantanément les commentaires marqués du Sceau de l'Érudit 
// sur une œuvre donnée pour les injecter dans le SSR (Server-Side Rendering).
UniversalCommentSchema.index({ targetUid: 1, isScholarSealed: 1 });

export const UniversalCommentModel = 
  mongoose.models.UniversalComment || mongoose.model<IUniversalComment>('UniversalComment', UniversalCommentSchema);