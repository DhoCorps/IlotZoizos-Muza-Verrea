import mongoose from 'mongoose';
import type { Document, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IRaffle } from '@ilot/types';

export interface IRaffleDocument extends Omit<IRaffle, '_id'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const { Schema } = mongoose;

const RaffleSchema = new Schema<IRaffleDocument>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    creatorUid: { type: String, required: true, index: true },
    prizeProductUid: { type: String, required: true, index: true },
    
    // Le prix en Éclats (Hack Karmique)
    ticketPriceShards: { type: Number, required: true, min: 0 },
    
    maxTickets: { type: Number, min: 1 },

    // ⏳ LE VERROU TEMPOREL : La date de tirage est immuable
    drawDate: { 
      type: Date, 
      required: true,
      immutable: true, // Empêche la modification après la création !
      index: true // Essentiel pour le CRON qui cherchera les loteries expirées
    },

    status: {
      type: String,
      enum: ['OPEN', 'DRAWN', 'CANCELLED'],
      default: 'OPEN',
      index: true
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

export const RaffleModel = (mongoose.models.Raffle as Model<IRaffleDocument>) || 
                           mongoose.model<IRaffleDocument>('Raffle', RaffleSchema);