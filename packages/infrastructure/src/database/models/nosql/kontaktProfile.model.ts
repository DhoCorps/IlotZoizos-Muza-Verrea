import mongoose from 'mongoose';
import type { Document } from 'mongoose';
import { KontaktProfile } from '@ilot/types';

const { Schema } = mongoose;

export interface IKontaktProfileDocument extends Omit<KontaktProfile, '_id'>, Document {
  createdAt: Date;
  updatedAt: Date;
}

const ttrpgAlignments = [
  'LOYAL_GOOD', 'NEUTRAL_GOOD', 'CHAOTIC_GOOD',
  'LOYAL_NEUTRAL', 'TRUE_NEUTRAL', 'CHAOTIC_NEUTRAL',
  'LOYAL_EVIL', 'NEUTRAL_EVIL', 'CHAOTIC_EVIL',
  'ANGE_INS', 'DEMON_INS', 'REPLICANT_BR', 'HUMAIN_BR'
];

// 🚀 Sous-schéma Mongoose pour les éléments du Portfolio
const PortfolioItemSchema = new Schema({
  type: { type: String, enum: ['IMAGE', 'GITHUB_REPO', 'AUDIO', '3D', 'WEB'], required: true },
  url: { type: String, required: true, trim: true },
  title: { type: String, required: true, trim: true },
  tags: [{ type: String, trim: true }]
}, { _id: false });

// 🚀 Sous-schéma Mongoose pour les Tarifs
const PricingProfileSchema = new Schema({
  hourlyRateCents: { type: Number, required: true, min: 0 },
  missionRateCents: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'EUR', trim: true }
}, { _id: false });

// 🚀 Sous-schéma Mongoose pour les Avis (Reviews)
const ReviewSchema = new Schema({
  authorUid: { type: String, required: true, trim: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, required: true, trim: true },
  isVerifiedHire: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

// 🚀 Sous-schéma Mongoose pour le SEO mutualisé
const SeoMetadataSchema = new Schema({
  metaTitle: { type: String, maxlength: 60, trim: true },
  metaDescription: { type: String, maxlength: 160, trim: true },
  ogImageUrl: { type: String, trim: true },
  canonicalUrl: { type: String, trim: true },
  ogType: { type: String, trim: true, default: 'profile' },
  articleAuthor: { type: String, trim: true }
}, { _id: false });

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
  
  // 🛡️ Application stricte de l'énumération RPG issue de Zod
  alignment: { 
    type: String, 
    enum: ttrpgAlignments,
    default: 'TRUE_NEUTRAL', 
    trim: true 
  },
  
  attributes: {
    force: { type: Number, default: 10, min: 1, max: 20 },
    agilite: { type: Number, default: 10, min: 1, max: 20 },
    intelligence: { type: Number, default: 10, min: 1, max: 20 },
    charisme: { type: Number, default: 10, min: 1, max: 20 },
    empathieVoightKampff: { type: Number, default: 50, min: 0, max: 100 },
  },
  specialArtifacts: [{ type: String, trim: true }],
  biographyLore: { type: String, maxlength: 500, trim: true, default: '' },
  
  // Champs enrichis existants
  portfolioItems: { type: [PortfolioItemSchema], default: [] },
  pricing: { type: PricingProfileSchema },
  reviews: { type: [ReviewSchema], default: [] },

  // 🚀 Squelette obligatoire mutualisé (Tags, SEO & Settings de gouvernance)
  tags: { type: [{ type: String, lowercase: true, trim: true }], default: [], index: true },
  seo: { type: SeoMetadataSchema, default: () => ({}) },
  settings: {
    allowDirectContact: { type: Boolean, default: true },
    showcaseBadge: { type: Boolean, default: true }
  }
}, { timestamps: true });

export const KontaktProfileModel = mongoose.models.KontaktProfile || mongoose.model<IKontaktProfileDocument>('KontaktProfile', KontaktProfileSchema);