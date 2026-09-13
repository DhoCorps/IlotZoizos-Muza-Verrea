import mongoose, { Schema, Document } from 'mongoose';

export interface IPraise extends Document {
  author: mongoose.Types.ObjectId;
  recipient: mongoose.Types.ObjectId;
  text: string;
  type: 'gratitude' | 'civic' | 'artistic';
  createdAt: Date;
}

const PraiseSchema = new Schema<IPraise>({
  author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true, maxlength: 500 },
  type: {
    type: String,
    enum: ['gratitude', 'civic', 'artistic'],
    default: 'gratitude',
    required: true
  },
  createdAt: { type: Date, default: Date.now }
});

export const PraiseModel = mongoose.models.Praise || mongoose.model<IPraise>('Praise', PraiseSchema);