import mongoose from 'mongoose';
import type { Document, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IRaffleTicket } from '@ilot/types';

export interface IRaffleTicketDocument extends Omit<IRaffleTicket, '_id'>, Document {
  _id: Types.ObjectId;
  createdAt: Date; // Équivalent à purchasedAt dans notre schéma Zod
  updatedAt: Date;
}

const { Schema } = mongoose;

const TicketSchema = new Schema<IRaffleTicketDocument>(
  {
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },
    raffleUid: { type: String, required: true, index: true },
    buyerUid: { type: String, required: true, index: true },
    
    ticketNumber: { 
      type: Number, 
      required: true,
      min: 1 
    },
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

// 🛡️ SÉCURITÉ CONCURRENCE : Empêche l'attribution du même numéro à deux acheteurs pour la même loterie
TicketSchema.index({ raffleUid: 1, ticketNumber: 1 }, { unique: true });

export const TicketModel = (mongoose.models.RaffleTicket as Model<IRaffleTicketDocument>) || 
                           mongoose.model<IRaffleTicketDocument>('RaffleTicket', TicketSchema);