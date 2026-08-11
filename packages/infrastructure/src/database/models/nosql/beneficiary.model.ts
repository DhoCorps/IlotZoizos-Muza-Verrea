// packages/infrastructure/src/database/models/nosql/beneficiary.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IExternalBeneficiary extends Document {
  beneficiaryUid: string;
  name: string;
  role: string;
  contactInfo?: string;
  isRegisteredOnIlot: boolean;
  ilotUserUid?: string;
  createdAt: Date;
}

const ExternalBeneficiarySchema = new Schema<IExternalBeneficiary>({
  beneficiaryUid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  role: { type: String, default: 'Ayant-droit externe' },
  contactInfo: { type: String },
  isRegisteredOnIlot: { type: Boolean, default: false },
  ilotUserUid: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

export const ExternalBeneficiaryModel = 
  mongoose.models.ExternalBeneficiary || 
  mongoose.model<IExternalBeneficiary>('ExternalBeneficiary', ExternalBeneficiarySchema);