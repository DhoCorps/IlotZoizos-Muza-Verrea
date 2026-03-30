import mongoose, { Schema, Document } from 'mongoose';


export interface ICandidate extends Document {
  uid: string;
  name: string;
  email: string;
  poste: string;
  status: 'nouveau' | 'entretien' | 'accepté' | 'refusé';
  cvUrl?: string;
  notes?: string;
  createdAt: Date;
}

const CandidateSchema = new Schema({
  uid: { type: String, required: true, unique: true },
  nom: { type: String, required: true },
  email: { type: String, required: true },
  poste: { type: String, required: true },
  status: { type: String, default: 'nouveau' },
  cvUrl: { type: String },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const CandidateModel = mongoose.models.Candidate || mongoose.model<ICandidate>('Candidate', CandidateSchema);