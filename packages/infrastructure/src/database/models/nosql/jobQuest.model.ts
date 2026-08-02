import mongoose, { Schema, Document } from 'mongoose';

export interface IJobQuestDocument extends Document {
  uid: string;
  projectUid: string;
  title: string;
  slug: string; // 🪡 L'index pour l'URL
  description: string;
  requiredSkills: string[];
  rewardLore: string;
  status: 'ACTIVE' | 'FILLED' | 'ARCHIVED';
  createdAt: Date;
}

const JobQuestSchema = new Schema<IJobQuestDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  projectUid: { type: String, required: true, index: true },
  title: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true }, // 🪡 Indexé pour la recherche SEO
  description: { type: String, required: true },
  requiredSkills: [{ type: String }],
  rewardLore: { type: String },
  status: { type: String, enum: ['ACTIVE', 'FILLED', 'ARCHIVED'], default: 'ACTIVE' },
}, { timestamps: true });

export const JobQuestModel = mongoose.models.JobQuest || mongoose.model<IJobQuestDocument>('JobQuest', JobQuestSchema);