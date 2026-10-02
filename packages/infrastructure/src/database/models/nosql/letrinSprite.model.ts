// Fichier : packages/infrastructure/src/nosql/letrinSprite.model.ts
import mongoose, { Document, Schema } from 'mongoose';

// 🔠 Énumération locale (alignée sur @ilot/types) pour la validation Mongoose
const CATEGORY_ENUM = ['HUMANE', 'GARALDE', 'DIDINE', 'MECANE', 'LINEALE', 'SCRIPTURE', 'GOTHIQUE', 'FANTAISIE'];
const STATUS_ENUM = ['DRAFT', 'RELEASED', 'ARCHIVED'];

// ==========================================
// INTERFACES TYPESCRIPT POUR MONGOOSE
// ==========================================
export interface ILetrinFontFiliationSource {
  isExternalSource: boolean;
  sourceAuthorName: string;
  sourceWorkTitle: string;
  sourceReferenceUrl?: string;
  claimStatus: 'PENDING_CLAIM' | 'SHARED' | 'REVOKED';
  escrowBalance: number;
  derivativeType?: string;
}

export interface ILetrinFontSpriteDocument extends Document {
  uid: string;
  name: string;
  slug: string; // 🪡 Empreinte URL unique
  authorUid: string;
  
  // Paramètres de grille
  gridSize: { width: number; height: number };
  
  // Taxonomie & SEO
  category: string;
  categoryDescription?: string;
  tags: string[];
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    ogImageUrl?: string;
  };
  
  // 🚀 Sceau Cryptographique Unifié (Remplace copyrightMetadata, digitalSignature, timestampedAt et copyrightClaimed)
  cryptoSeal?: {
    digitalSignature: string;
    timestampedAt: Date;
    sealedByUid?: string;
    copyrightMetadata?: {
      role: string;
      isExclusiveIlot: boolean;
      license: string;
      originalAuthor?: string;
      originalWorkTitle?: string;
      sublimationNotes?: string;
      filiation?: ILetrinFontFiliationSource;
    };
  };

  // Fréquence Alchimique
  frequencyHz: number;
  isFrequencyMuted: boolean;

  // Matrices & Glyphes
  glyphs: Array<{
    character: string;
    unicodeCodePoint?: string;
    frames: Array<{
      frameIndex: number;
      width: number;
      height: number;
      pixels: string[];
    }>;
    advanceWidth: number;
    barter?: {
      isBarterable: boolean;
      barterValueKarma: number;
      desiredExchangeGlyph?: string;
    };
  }>;

  // 🎮 Gamification & Progression de l'Oiseau Forgeron
  gamification: {
    palette: string[];
    alchemicalXp: number;
    glitchCorruptionLevel: number;
    unlockedFontSlots: number;
    unlockedSpriteSlots: number;
  };

  // Traçabilité
  status: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// SCHÉMAS MONGOOSE (Sous-documents)
// ==========================================
const FiliationSourceSchema = new Schema<ILetrinFontFiliationSource>({
  isExternalSource: { type: Boolean, default: false },
  sourceAuthorName: { type: String, trim: true },
  sourceWorkTitle: { type: String, trim: true },
  sourceReferenceUrl: { type: String, trim: true },
  claimStatus: { type: String, enum: ['PENDING_CLAIM', 'SHARED', 'REVOKED'], default: 'PENDING_CLAIM' },
  escrowBalance: { type: Number, default: 0, min: 0 },
  derivativeType: { type: String, trim: true }
}, { _id: false });

const CopyrightMetadataSchema = new Schema({
  role: { type: String, enum: ['CREATOR', 'SUBLIMATOR', 'CURATOR'], default: 'CREATOR' },
  originalAuthor: { type: String, trim: true },
  originalWorkTitle: { type: String, trim: true },
  sublimationNotes: { type: String, trim: true },
  isExclusiveIlot: { type: Boolean, default: false },
  license: { type: String, default: 'MIT / Libre Canopée' },
  filiation: { type: FiliationSourceSchema }
}, { _id: false });

const CryptographicSealSchema = new Schema({
  digitalSignature: { type: String, required: true, index: true },
  timestampedAt: { type: Date, required: true, default: Date.now },
  sealedByUid: { type: String },
  copyrightMetadata: { type: CopyrightMetadataSchema }
}, { _id: false });

// ==========================================
// SCHÉMA MONGOOSE PRINCIPAL
// ==========================================
const LetrinFontSpriteSchema = new Schema<ILetrinFontSpriteDocument>({
  uid: { type: String, required: true, unique: true, index: true },
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true, index: true },
  authorUid: { type: String, required: true, index: true },
  
  gridSize: {
    width: { type: Number, default: 16 },
    height: { type: Number, default: 16 },
  },

  category: { type: String, enum: CATEGORY_ENUM, default: 'LINEALE' },
  categoryDescription: { type: String },
  tags: [{ type: String }],
  
  seo: {
    metaTitle: { type: String },
    metaDescription: { type: String },
    ogImageUrl: { type: String },
  },

  // 🚀 Intégration du Sceau (Optionnel comme défini par le schéma Zod)
  cryptoSeal: {
    type: CryptographicSealSchema,
    default: undefined
  },

  frequencyHz: { type: Number, default: 432 }, // La fréquence de guérison par défaut
  isFrequencyMuted: { type: Boolean, default: false },

  glyphs: [{
    character: { type: String, required: true },
    unicodeCodePoint: { type: String },
    frames: [{
      frameIndex: { type: Number, required: true },
      width: { type: Number, default: 16 },
      height: { type: Number, default: 16 },
      pixels: [{ type: String }]
    }],
    advanceWidth: { type: Number, default: 16 },
    barter: {
      isBarterable: { type: Boolean, default: false },
      barterValueKarma: { type: Number, default: 0 },
      desiredExchangeGlyph: { type: String }
    }
  }],

  gamification: {
    palette: [{ type: String }],
    alchemicalXp: { type: Number, default: 0 },
    glitchCorruptionLevel: { type: Number, default: 0 },
    unlockedFontSlots: { type: Number, default: 3 }, // 3 polices offertes au départ
    unlockedSpriteSlots: { type: Number, default: 3 } // 3 sprites offerts au départ
  },

  status: { type: String, enum: STATUS_ENUM, default: 'DRAFT' }
}, { timestamps: true });

// Évite la recompilation du modèle en mode "watch" (Next.js / Vitest)
export const LetrinFontSpriteModel = mongoose.models.LetrinFontSprite || mongoose.model<ILetrinFontSpriteDocument>('LetrinFontSprite', LetrinFontSpriteSchema);