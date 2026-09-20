import mongoose from 'mongoose';
import type { Document, Model, Types } from 'mongoose';
const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { ShareEvent, PropagationScopeSchema, ExtendedEntityTypeSchema } from '@ilot/types';

export interface IShareEventDocument extends Omit<ShareEvent, 'createdAt'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ShareEventSchema = new Schema<IShareEventDocument>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },

    // L'Oiseau qui initie le partage
    sourceUid: { type: String, required: true, index: true },

    // L'Œuvre partagée
    artifactUid: { type: String, required: true },
    artifactType: {
      type: String,
      enum: ExtendedEntityTypeSchema.options,
      required: true
    },

    // La portée du partage
    scope: {
      type: String,
      enum: PropagationScopeSchema.options,
      default: 'GLOBAL',
      required: true
    },

    // La liste des destinataires (pour le partage ciblé)
    // 🛡️ SUPER-VALIDATION NATIVE : Intégrée au champ pour contourner les limites de validateSync()
    receiverUids: { 
      type: [{ type: String }],
      validate: [
        {
          validator: function(this: any, val: string[]) {
            // Un partage ciblé nécessite au moins un destinataire
            if (this.scope === 'TARGETED') {
              return val != null && val.length > 0;
            }
            return true;
          },
          message: 'Incohérence du Kosmos : Un partage ciblé exige des destinataires.'
        },
        {
          validator: function(this: any, val: string[]) {
            // Un partage global doit avoir un tableau vide
            if (this.scope === 'GLOBAL') {
              return val == null || val.length === 0;
            }
            return true;
          },
          message: 'Incohérence du Kosmos : Un partage global n\'accepte aucun destinataire.'
        }
      ]
    },

    // Le message d'accompagnement
    customMessage: { type: String, maxlength: 500 },

    // Télémétrie de la qualité du partage
    metrics: {
      merciCount: { type: Number, default: 0 },
      noiseCount: { type: Number, default: 0 },
      returnRatio: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: Record<string, unknown>) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// ==========================================
// INDEX DE PERFORMANCE (Récompenser le Passeur)
// ==========================================

// 1. Index composé absolu : Trouver instantanément toutes les fois où un Oiseau X a partagé l'Œuvre Y
ShareEventSchema.index({ sourceUid: 1, artifactUid: 1 });

// 2. Index pour trouver rapidement tous les partages d'une œuvre spécifique
ShareEventSchema.index({ artifactUid: 1 });

export const ShareEventModel = 
  (mongoose.models.ShareEvent as Model<IShareEventDocument>) || 
  mongoose.model<IShareEventDocument>('ShareEvent', ShareEventSchema);