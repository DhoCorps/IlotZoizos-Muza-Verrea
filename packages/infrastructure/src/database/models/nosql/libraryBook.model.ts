// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema, model, models } = mongoose;

// ✨ Sous-schémas pour les Métadonnées et l'Économie
export interface IEmotionalHighlight {
  uid: string;
  readerUid: string;
  selectedText: string;
  emotion: string; // Ex: '<(:<'
  comment?: string;
  isScholarSealed?: boolean; // Promeut la note en "Note d'Érudit"
  createdAt: Date;
}

export interface ISeoMetadata {
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  canonicalUrl?: string;
  ogType?: string;
  articleAuthor?: string;
  publishedTime?: Date;
}

export interface ILibraryBookEconomy {
  priceCents: number;
  currency?: string;
  rights: {
    allowCommercial?: boolean;
    allowBarter?: boolean;
    allowLending?: boolean;
    transferable?: boolean;
  };
  barterAllowed: boolean;
  gachaTier: string;
  isTradable: boolean;
}

// 🚀 Ajout de l'interface Filiation Mongoose pour correspondre au Pacte
export interface ILibraryBookFiliationSource {
  isExternalSource: boolean;
  sourceAuthorName: string;
  sourceWorkTitle: string;
  sourceReferenceUrl?: string;
  claimStatus: 'PENDING_CLAIM' | 'SHARED' | 'REVOKED';
  escrowBalance: number;
  derivativeType?: string;
}

export interface ILibraryBook extends Document {
  uid: string;
  title: string;
  slug: string;
  authorUid: string;
  authorSlug: string;
  
  // 📚 Classification ouverte et cycle de vie
  writingType: string;
  style: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  
  fileUrl: string;
  coverUrl?: string;
  format: 'epub' | 'pdf' | 'txt' | 'scriptorium';
  
  // 🛡️ Sceau Cryptographique d'Antériorité & Copyright DRY (Pacte de Filiation inclus)
  digitalSignature: string;
  timestampedAt: Date;
  copyrightClaimed: boolean;
  copyrightMetadata?: {
    role: 'CREATOR' | 'SUBLIMATOR' | 'CURATOR';
    originalAuthor?: string;
    originalWorkTitle?: string;
    sublimationNotes?: string;
    isExclusiveIlot: boolean;
    filiation?: ILibraryBookFiliationSource; // 🚀 Suture du Pacte de Filiation
  };

  settings: {
    allowReadExchange: boolean;
    consentForShowcase: boolean;
  };
  
  // 🔗 Extensions de Résonance et d'Économie
  seo?: ISeoMetadata;
  economy?: ILibraryBookEconomy;
  emotionalHighlights: IEmotionalHighlight[]; // Le mur des fulgurances

  createdAt: Date;
  updatedAt: Date;
}

const EmotionalHighlightSchema = new Schema<IEmotionalHighlight>({
  uid: { type: String, required: true },
  readerUid: { type: String, required: true },
  selectedText: { type: String, required: true },
  emotion: { type: String, required: true },
  comment: { type: String },
  isScholarSealed: { type: Boolean, default: false }, // Devient une Note d'Érudit si true
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const SeoMetadataSchema = new Schema<ISeoMetadata>({
  metaTitle: { type: String, maxlength: 60 },
  metaDescription: { type: String, maxlength: 160 },
  ogImageUrl: { type: String },
  canonicalUrl: { type: String },
  ogType: { type: String, enum: ['website', 'article', 'book'], default: 'book' },
  articleAuthor: { type: String },
  publishedTime: { type: Date }
}, { _id: false });

const LibraryBookEconomySchema = new Schema<ILibraryBookEconomy>({
  priceCents: { type: Number, default: 0 },
  currency: { type: String, default: 'EUR' },
  rights: {
    allowCommercial: { type: Boolean, default: false },
    allowBarter: { type: Boolean, default: true },
    allowLending: { type: Boolean, default: true },
    transferable: { type: Boolean, default: false },
  },
  barterAllowed: { type: Boolean, default: true },
  gachaTier: { type: String, enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', 'mythic'], default: 'common' },
  isTradable: { type: Boolean, default: false }
}, { _id: false });

// 🚀 Sous-schéma Mongoose du Pacte de Filiation
const FiliationSourceSchema = new Schema<ILibraryBookFiliationSource>({
  isExternalSource: { type: Boolean, default: false },
  sourceAuthorName: { type: String, trim: true },
  sourceWorkTitle: { type: String, trim: true },
  sourceReferenceUrl: { type: String, trim: true },
  claimStatus: { type: String, enum: ['PENDING_CLAIM', 'SHARED', 'REVOKED'], default: 'PENDING_CLAIM' },
  escrowBalance: { type: Number, default: 0, min: 0 },
  derivativeType: { type: String, trim: true }
}, { _id: false });

const LibraryBookSchema = new Schema<ILibraryBook>({
  uid: { type: String, required: true, unique: true, index: true },
  title: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, index: true },
  authorUid: { type: String, required: true, index: true },
  authorSlug: { type: String, required: true },
  
  writingType: { type: String, required: true, default: 'roman', index: true },
  style: { type: String, required: true, default: 'philosophie', index: true },
  status: { type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'], default: 'DRAFT', index: true },

  fileUrl: { type: String, required: true },
  coverUrl: { type: String },
  format: { type: String, enum: ['epub', 'pdf', 'txt', 'scriptorium'], default: 'scriptorium' },

  digitalSignature: { type: String, required: true, index: true },
  timestampedAt: { type: Date, required: true, default: Date.now },
  copyrightClaimed: { type: Boolean, default: true },
  copyrightMetadata: {
    role: { type: String, enum: ['CREATOR', 'SUBLIMATOR', 'CURATOR'], default: 'CREATOR' },
    originalAuthor: { type: String, trim: true },
    originalWorkTitle: { type: String, trim: true },
    sublimationNotes: { type: String, trim: true },
    isExclusiveIlot: { type: Boolean, default: false },
    filiation: { type: FiliationSourceSchema } // 🚀 Intégration Mongoose du Pacte de Filiation
  },

  settings: {
    allowReadExchange: { type: Boolean, default: true },
    consentForShowcase: { type: Boolean, default: true }
  },

  seo: { type: SeoMetadataSchema },
  economy: { type: LibraryBookEconomySchema },
  emotionalHighlights: { type: [EmotionalHighlightSchema], default: [] }
}, {
  timestamps: true
});

export const LibraryBookModel = mongoose.models.LibraryBook || mongoose.model<ILibraryBook>('LibraryBook', LibraryBookSchema);