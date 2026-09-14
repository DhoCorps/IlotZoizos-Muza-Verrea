// packages/infrastructure/src/database/models/nosql/beneficiary.model.ts
import mongoose from 'mongoose';

// 1. Importe les types en tant que types purs (zéro impact au runtime)
import type { Document, Model, Schema as MongooseSchema } from 'mongoose';

// 2. Récupère les constructeurs nécessaires pour le runtime
const { model, models } = mongoose;

export interface IExternalBeneficiary extends Document {
  beneficiaryUid: string;
  name: string;
  role: string;
  contactInfo?: string;
  isRegisteredOnIlot: boolean;
  ilotUserUid?: string;
  createdAt: Date;
}

// Utilisation de mongoose.Schema car Schema n'est qu'un type ici
const ExternalBeneficiarySchema = new mongoose.Schema<IExternalBeneficiary>({
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