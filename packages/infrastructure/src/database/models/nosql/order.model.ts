import mongoose, { Schema, Document } from 'mongoose';

export interface IOrderDocument extends Document {
  uid: string;
  buyerUid: string;
  storeUid: string;
  items: Array<{
    productUid: string;
    title: string;
    priceCents: number;
    quantity: number;
  }>;
  totalAmountCents: number;
  stripePaymentIntentId: string;
  status: 'PENDING' | 'PAID' | 'FULFILLED' | 'CANCELLED';
  createdAt: Date;
}

const OrderSchema = new Schema<IOrderDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  buyerUid: { type: String, required: true, index: true },
  storeUid: { type: String, required: true, index: true },
  items: [{
    productUid: { type: String, required: true },
    title: { type: String, required: true },
    priceCents: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
  }],
  totalAmountCents: { type: Number, required: true },
  stripePaymentIntentId: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING', 'PAID', 'FULFILLED', 'CANCELLED'], 
    default: 'PENDING' 
  },
}, { timestamps: true });

export const OrderModel = mongoose.models.Order || mongoose.model<IOrderDocument>('Order', OrderSchema);