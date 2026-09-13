import mongoose, { Schema, Document } from 'mongoose';

export interface ILibraryBook extends Document {
  uid: string;
  title: string;
  slug: string;
  authorUid: string;
  authorSlug: string;
  
  // 📚 Classification ouverte et extensible
  writingType: string; // Ex: 'roman', 'essai', ou valeur personnalisée libre
  style: string;       // Ex: 'philosophie', 'cyberpunk', ou valeur personnalisée libre
  
  fileUrl: string;     // URL du fichier source sur le Nexus R2 (EPUB / PDF / TXT)
  coverUrl?: string;   // Illustration de couverture
  format: 'epub' | 'pdf' | 'txt' | 'scriptorium';
  
  // 🛡️ Sceau Cryptographique d'Antériorité
  digitalSignature: string; // Hash SHA-256 de 64 caractères
  timestampedAt: Date;
  copyrightClaimed: boolean;

  settings: {
    allowReadExchange: boolean; // Participe au troc de savoir (Brindilles)
    consentForShowcase: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const LibraryBookSchema = new Schema<ILibraryBook>({
  uid: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  authorUid: { type: String, required: true, index: true },
  authorSlug: { type: String, required: true },
  
  // Champs ouverts autorisant les valeurs standards ou créées par l'Oiseau
  writingType: { type: String, required: true, default: 'roman', index: true },
  style: { type: String, required: true, default: 'philosophie', index: true },

  fileUrl: { type: String, required: true },
  coverUrl: { type: String },
  format: { type: String, enum: ['epub', 'pdf', 'txt', 'scriptorium'], default: 'scriptorium' },

  // Preuve mathématique d'antériorité
  digitalSignature: { type: String, required: true, index: true },
  timestampedAt: { type: Date, required: true, default: Date.now },
  copyrightClaimed: { type: Boolean, default: true },

  settings: {
    allowReadExchange: { type: Boolean, default: true },
    consentForShowcase: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

export const LibraryBookModel = mongoose.models.LibraryBook || mongoose.model<ILibraryBook>('LibraryBook', LibraryBookSchema);