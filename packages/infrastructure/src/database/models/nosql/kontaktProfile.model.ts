import mongoose, { Document } from 'mongoose';

const { Schema } = mongoose;

export interface IKontaktProfileDocument extends Document {
  uid: string;
  userUid: string;
  professionalTitle: string;
  slug: string; // 🪡
  seniorityYears: number;
  skills: string[];
  portfolioUrl?: string;
  availabilityStatus: 'OPEN_TO_WORK' | 'ON_A_QUEST' | 'RECRUITED';
  archetypeClass: string;
  alignment: string;
  attributes: {
    force: number;
    agilite: number;
    intelligence: number;
    charisme: number;
    empathieVoightKampff: number;
  };
  specialArtifacts: string[];
  biographyLore: string;
  createdAt: Date;
  updatedAt: Date;
}

const KontaktProfileSchema = new Schema<IKontaktProfileDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  userUid: { type: String, required: true, unique: true, index: true },
  professionalTitle: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🪡
  seniorityYears: { type: Number, default: 0, min: 0 },
  skills: [{ type: String, trim: true }],
  portfolioUrl: { type: String, trim: true },
  availabilityStatus: { 
    type: String, 
    enum: ['OPEN_TO_WORK', 'ON_A_QUEST', 'RECRUITED'], 
    default: 'OPEN_TO_WORK' 
  },
  archetypeClass: { type: String, required: true, trim: true },
  alignment: { type: String, default: 'TRUE_NEUTRAL', trim: true },
  attributes: {
    force: { type: Number, default: 10, min: 1, max: 20 },
    agilite: { type: Number, default: 10, min: 1, max: 20 },
    intelligence: { type: Number, default: 10, min: 1, max: 20 },
    charisme: { type: Number, default: 10, min: 1, max: 20 },
    empathieVoightKampff: { type: Number, default: 50, min: 0, max: 100 },
  },
  specialArtifacts: [{ type: String, trim: true }],
  biographyLore: { type: String, maxlength: 500, trim: true },
}, { timestamps: true });

export const KontaktProfileModel = mongoose.models.KontaktProfile || mongoose.model<IKontaktProfileDocument>('KontaktProfile', KontaktProfileSchema);