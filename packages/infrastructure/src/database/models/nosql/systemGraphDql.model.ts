// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema, model, models } = mongoose;

export interface ISystemGraphDlqDocument extends Document {
  operationName: string;
  errorPayload: string;
  status: 'PENDING_RETRY' | 'RESOLVED' | 'FAILED_PERMANENTLY';
  retryCount: number;
  lastAttemptAt?: Date;
  timestamp: Date;
}

const systemGraphDlqSchema = new Schema<ISystemGraphDlqDocument>({
  operationName: { type: String, required: true, index: true },
  errorPayload: { type: String, required: true },
  status: { 
    type: String, 
    enum: ['PENDING_RETRY', 'RESOLVED', 'FAILED_PERMANENTLY'], 
    default: 'PENDING_RETRY',
    index: true 
  },
  retryCount: { type: Number, default: 0 },
  lastAttemptAt: { type: Date },
  timestamp: { type: Date, default: Date.now }
}, {
  timestamps: true,
  collection: 'system_graph_dlq'
});

export const SystemGraphDlqModel = mongoose.models.SystemGraphDlq || mongoose.model<ISystemGraphDlqDocument>('SystemGraphDlq', systemGraphDlqSchema);