import mongoose, { Schema, Document } from 'mongoose';

export interface ISubsidyRequest extends Document {
  requesterUid: string;
  title: string;
  motivation: string;
  requestedAmount: number;
  currency: 'TOX' | 'DHO';
  voteCount: number;
  voterUids: string[]; // Liste des oiseaux ayant voté pour éviter les votes multiples
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'PAID';
  isRented: boolean; // Si c'est une rente ou un paiement unique
  createdAt: Date;
}

const SubsidySchema = new Schema<ISubsidyRequest>({
  requesterUid: { type: String, required: true },
  title: { type: String, required: true },
  motivation: { type: String, required: true },
  requestedAmount: { type: Number, required: true },
  currency: { type: String, enum: ['TOX', 'DHO'], default: 'TOX' },
  voteCount: { type: Number, default: 0 },
  voterUids: [{ type: String }],
  status: { type: String, enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'PAID'], default: 'PENDING' },
  isRented: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

export const SubsidyModel = mongoose.models.Subsidy || mongoose.model<ISubsidyRequest>('Subsidy', SubsidySchema);