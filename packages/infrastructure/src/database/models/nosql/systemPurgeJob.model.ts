import mongoose, { Schema, Document } from 'mongoose';

export interface ISystemPurgeJobDocument extends Document {
  entityId: string;
  reason: string;
  actorUid: string;
  capabilities: string[];
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorPayload?: string;
  createdAt: Date;
  updatedAt: Date;
}

const systemPurgeJobSchema = new Schema<ISystemPurgeJobDocument>({
  entityId: { type: String, required: true, index: true },
  reason: { type: String, required: true },
  actorUid: { type: String, required: true },
  capabilities: [{ type: String }],
  status: { 
    type: String, 
    enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'], 
    default: 'PENDING',
    index: true 
  },
  errorPayload: { type: String }
}, {
  timestamps: true,
  collection: 'system_purge_jobs'
});

export const SystemPurgeJobModel = mongoose.models.SystemPurgeJob || mongoose.model<ISystemPurgeJobDocument>('SystemPurgeJob', systemPurgeJobSchema);