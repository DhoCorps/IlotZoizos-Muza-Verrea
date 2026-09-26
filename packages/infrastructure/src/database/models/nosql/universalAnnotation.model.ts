import mongoose from 'mongoose';

// 1. Importe les types Mongoose en tant que types purs (zéro impact au runtime)
import type { Document, Model } from 'mongoose';

// 2. Importation de l'interface universelle depuis nos types partagés
import { IUniversalAnnotation } from '@ilot/types';

// 3. Extension du Document Mongoose
export interface IUniversalAnnotationDocument extends Omit<IUniversalAnnotation, 'uid'>, Document {
  uid: string;
  createdAt: Date;
  updatedAt: Date;
}

// 4. Définition du Schéma Universel
const UniversalAnnotationSchema = new mongoose.Schema<IUniversalAnnotationDocument>(
  {
    uid: { type: String, required: true, unique: true, index: true },
    
    // Le nouveau cœur universel (remplace bookUid)
    targetUid: { type: String, required: true, index: true },
    targetType: { 
      type: String, 
      enum: ['BOOK', 'ARTICLE', 'COMMENT'], 
      required: true,
      index: true 
    },
    targetTitle: { type: String }, // Remplace bookTitle
    
    authorUid: { type: String, required: true, index: true },
    
    // Contenu de l'annotation
    selectedText: { type: String, required: true },
    comment: { type: String, trim: true }, // trim: true conservé de l'ancien modèle
    importance: { type: Number, required: true, default: 1, min: 1, max: 5, index: true },
    emotion: { type: String },
    chapterReference: { type: String },
    
    // Méta-données spécifiques à l'Îlot
    isScholarSealed: { type: Boolean, default: false },
  },
  { 
    timestamps: true,
    // On force le nom de la collection pour ne pas perdre les anciennes annotations en DB !
    collection: 'annotations' 
  }
);

// ⚡ Index composites pour garantir des requêtes ultra-rapides depuis n'importe quel module
// Permet de requêter très vite "Toutes les annotations d'un ARTICLE spécifique"
UniversalAnnotationSchema.index({ targetType: 1, targetUid: 1 });
// Permet de requêter très vite "Toutes les notes d'un auteur sur un type précis"
UniversalAnnotationSchema.index({ authorUid: 1, targetType: 1 });

// Exportation sous les deux noms pour faciliter la migration graduelle
export const UniversalAnnotationModel: Model<IUniversalAnnotationDocument> =
  mongoose.models.UniversalAnnotation ||
  mongoose.model<IUniversalAnnotationDocument>('UniversalAnnotation', UniversalAnnotationSchema);

// Alias de rétrocompatibilité pour ne pas casser les imports actuels immédiatement
export const AnnotationModel = UniversalAnnotationModel;