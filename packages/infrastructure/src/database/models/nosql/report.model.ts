// Le fichier du modèle (ex: nosql/report.model.ts ou report.model.ts)
// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema, model, models } = mongoose;

export interface IMediationMessage {
  sender: mongoose.Types.ObjectId;
  message: string;
  timestamp: Date;
}

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  reportedUser: mongoose.Types.ObjectId;
  reason: string;
  status: 'mediation' | 'judgment' | 'resolved' | 'sanctioned';
  mediationLog: IMediationMessage[];
  createdAt: Date;
}

const ReportSchema = new Schema<IReport>({
  reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reportedUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, required: true, maxlength: 1000 },
  status: {
    type: String,
    enum: ['mediation', 'judgment', 'resolved', 'sanctioned'],
    default: 'mediation',
    required: true
  },
  mediationLog: [{
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

// 🛠️ Passage en export nommé
export const ReportModel = mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);