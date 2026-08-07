// apps/hub-central/models/BarterOffer.model.ts
import mongoose, { Document } from 'mongoose';

const { Schema } = mongoose;

export interface IBarterOfferDocument extends Document {
  uid: string;
  initiatorUid: string;
  receiverUid?: string;
  offeredProductUids: string[];
  requestedProductUids: string[];
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  createdAt: Date;
}

const BarterOfferSchema = new Schema<IBarterOfferDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  initiatorUid: { type: String, required: true, index: true },
  receiverUid: { type: String, index: true },
  offeredProductUids: [{ type: String, required: true }],
  requestedProductUids: [{ type: String, required: true }],
  status: { 
    type: String, 
    enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COMPLETED'], 
    default: 'PENDING' 
  },
}, { timestamps: true });

export const BarterOfferModel = mongoose.models.BarterOffer || mongoose.model<IBarterOfferDocument>('BarterOffer', BarterOfferSchema);