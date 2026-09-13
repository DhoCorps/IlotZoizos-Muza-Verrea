// Le fichier du modèle (ex: nosql/report.model.ts ou report.model.ts)
import mongoose, { Schema, Document } from 'mongoose';

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