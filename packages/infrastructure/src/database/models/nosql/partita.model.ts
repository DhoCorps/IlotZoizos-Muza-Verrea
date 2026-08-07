import mongoose, { Document, Model, Types } from 'mongoose';

const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { IPartita, InstrumentCategorySchema, ScoreFormatSchema } from '@ilot/types';

export interface IPartitaDocument extends Omit<IPartita, '_id'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PartitaSchema = new Schema<IPartitaDocument>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true },
    instrument: {
      type: String,
      enum: InstrumentCategorySchema.options,
      default: 'BASS',
      index: true
    },
    format: {
      type: String,
      enum: ScoreFormatSchema.options,
      default: 'ABC'
    },
    tuning: { type: String, default: 'E1-A1-D2-G2' },
    authorUid: { type: String, required: true, index: true },
    status: {
      type: String,
      enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED', 'BURNED'],
      default: 'DRAFT',
      index: true
    },
    tags: [{ type: String, index: true }],
    connections: {
      relatedProjects: [{ type: String }],
      relatedTasks: [{ type: String }],
      relatedProducts: [{ type: String }],
      relatedGames: [{ type: String }]
    },
    merchLink: {
      productId: { type: String },
      sku: { type: String },
      displayMode: { type: String, default: 'card' }
    },
    media: {
      coverImageUrl: { type: String },
      audioTrackUrl: { type: String }
    },
    settings: {
      allowComments: { type: Boolean, default: true },
      allowEmojiReactions: { type: Boolean, default: true }
    },
    resonance: {
      views: { type: Number, default: 0 },
      readsCompleted: { type: Number, default: 0 }
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

PartitaSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const PartitaModel = (mongoose.models.Partita as Model<IPartitaDocument>) || 
                           mongoose.model<IPartitaDocument>('Partita', PartitaSchema);