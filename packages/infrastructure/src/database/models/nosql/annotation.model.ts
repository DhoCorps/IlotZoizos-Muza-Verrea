// packages/infrastructure/src/database/models/nosql/annotation.model.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IAnnotation extends Document {
  uid: string;
  bookUid: string;
  bookTitle: string;
  authorUid: string;
  
  selectedText: string; // Le passage surligné dans le livre
  comment?: string;     // Réflexion ou commentaire personnel de l'Oiseau
  importance: number;   // 1 (Mineure), 2 (Notable), 3 (Vitale / Fondamentale)
  
  chapterReference?: string; // Optionnel : nom du chapitre ou position
  createdAt: Date;
  updatedAt: Date;
}

const AnnotationSchema = new Schema<IAnnotation>({
  uid: { type: String, required: true, unique: true, index: true },
  bookUid: { type: String, required: true, index: true },
  bookTitle: { type: String, required: true },
  authorUid: { type: String, required: true, index: true },
  
  selectedText: { type: String, required: true },
  comment: { type: String, trim: true },
  importance: { type: Number, required: true, default: 1, min: 1, max: 3, index: true },
  
  chapterReference: { type: String },
}, {
  timestamps: true
});

export const AnnotationModel = mongoose.models.Annotation || mongoose.model<IAnnotation>('Annotation', AnnotationSchema);