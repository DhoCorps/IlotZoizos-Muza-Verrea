// packages/infrastructure/src/database/models/nosql/resonance.model.ts

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { EntityLabel } from '@ilot/types';

export interface IEchoDocument extends Document {
  _id: Types.ObjectId;
  uid: string;
  targetUid: string;
  targetLabel: EntityLabel;
  actorUid: string;
  echoType: 'TEXT' | 'EMOJI';
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

const ResonanceEchoSchema = new Schema<IEchoDocument>({
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      default: () => uuidv4(), 
      index: true 
    },
    targetUid: { 
      type: String, 
      required: true, 
      index: true 
    },
    targetLabel: { 
      type: String, 
      required: true, 
      enum: ['Sujet', 'Project', 'Task', 'Team', 'Product', 'Game', 'Letter'] 
    },
    actorUid: { 
      type: String, 
      required: true, 
      index: true 
    },
    echoType: { 
      type: String, 
      required: true, 
      enum: ['TEXT', 'EMOJI'] 
    },
    content: { 
      type: String, 
      required: true, 
      trim: true 
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index composite pour l'affichage chronologique des échos sur une cible donnée
ResonanceEchoSchema.index({ targetUid: 1, createdAt: -1 });

export const ResonanceModel = (mongoose.models.Resonance as Model<IEchoDocument>) || 
                              mongoose.model<IEchoDocument>('Resonance', ResonanceEchoSchema);