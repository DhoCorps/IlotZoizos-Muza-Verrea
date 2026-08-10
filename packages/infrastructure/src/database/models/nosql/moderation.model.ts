import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';
import { ModerationRequest, ModerationSeverity } from '@ilot/types';

const { Schema } = mongoose;

export interface IModerationDocument extends ModerationRequest, Document {
    createdAt: Date;
    updatedAt: Date;
}

const ModerationSchema = new Schema({
    targetId: { type: String, required: true, index: true },
    targetType: { type: String, required: true, enum: ['USER', 'FRAGMENT', 'PROJECT'] },
    reason: { type: String, required: true, minlength: 5 },
    severity: { type: String, required: true, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    reportedBy: { type: String, index: true },
    context: { type: Schema.Types.Mixed, default: {} }
}, {
    timestamps: true,
    collection: 'moderations'
});

export const ModerationModel: Model<IModerationDocument> = 
    mongoose.models.Moderation || mongoose.model<IModerationDocument>('Moderation', ModerationSchema);