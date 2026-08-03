import mongoose, { Schema } from 'mongoose';

const PixelSchema = new Schema({
  c: { type: String, required: true },
  s: { type: String, required: true },
  r: { type: Number, default: 0 },
  bt: { type: Boolean, default: false },
  bb: { type: Boolean, default: false },
  bl: { type: Boolean, default: false },
  br: { type: Boolean, default: false },
  bc: { type: String, default: 'transparent' },
  bw: { type: Number, default: 1 }
}, { _id: false });

const FontProjectSchema = new Schema({
  title: { type: String, required: true },
  resolution: { type: Number, default: 16 },
  userId: { type: String, index: true },
  license: { 
    type: String, 
    enum: ['private', 'free', 'trade', 'sell'], 
    default: 'free' 
  },
  matrices: { type: Map, of: [[PixelSchema]], default: {} },
}, { timestamps: true });

export const FontProject = mongoose.models.FontProject || mongoose.model('FontProject', FontProjectSchema);