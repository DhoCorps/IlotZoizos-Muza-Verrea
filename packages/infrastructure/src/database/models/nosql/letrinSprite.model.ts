import mongoose, { Document, Schema } from 'mongoose';

// 🔠 Énumération locale (alignée sur @ilot/types) pour la validation Mongoose
const CATEGORY_ENUM = ['HUMANE', 'GARALDE', 'DIDINE', 'MECANE', 'LINEALE', 'SCRIPTURE', 'GOTHIQUE', 'FANTAISIE'];
const STATUS_ENUM = ['DRAFT', 'RELEASED', 'ARCHIVED'];

// ==========================================
// INTERFACES TYPESCRIPT POUR MONGOOSE
// ==========================================
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
  
  // Souveraineté & Fréquence Alchimique
  copyrightMetadata?: {
    role: string;
    isExclusiveIlot: boolean;
    license: string;
  };
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

  // Traçabilité & Sceau
  status: 'DRAFT' | 'RELEASED' | 'ARCHIVED';
  digitalSignature?: string;
  timestampedAt?: Date;
  copyrightClaimed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ==========================================
// SCHÉMA MONGOOSE
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

  copyrightMetadata: {
    role: { type: String, default: 'CREATOR' },
    isExclusiveIlot: { type: Boolean, default: true },
    license: { type: String, default: 'MIT / Libre Canopée' },
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

  status: { type: String, enum: STATUS_ENUM, default: 'DRAFT' },
  digitalSignature: { type: String },
  timestampedAt: { type: Date },
  copyrightClaimed: { type: Boolean, default: true }
}, { timestamps: true });

// Évite la recompilation du modèle en mode "watch" (Next.js / Vitest)
export const LetrinFontSpriteModel = mongoose.models.LetrinFontSprite || mongoose.model<ILetrinFontSpriteDocument>('LetrinFontSprite', LetrinFontSpriteSchema);