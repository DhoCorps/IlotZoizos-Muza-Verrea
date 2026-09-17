import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';

const { Schema, model, models } = mongoose;

export interface IStudioPermissions {
  allowShowcase?: boolean;
  allowRadio?: boolean;
}

export interface IUniversalMediaMetadata {
  bpm?: number;
  key?: string;
  isStudioProject?: boolean;
  usedSampleUids?: string[];
  permissions?: IStudioPermissions;
  [key: string]: unknown;
}

export interface IUniversalMediaDocument extends Document {
  mediaId: string;
  creatorUid: string;
  creatorSlug: string;
  sourceApp: 'PARTITA' | 'LETRIN' | 'ABYSS' | 'DHO' | 'GALLERY' | 'SPRITE' | 'UNKNOWN';
  type: 'IMAGE' | 'AUDIO_TRACK' | 'AUDIO_STEM' | 'TEXT';
  title: { fr: string; en?: string };
  description?: { fr: string; en?: string };
  fileUrl: string;
  thumbnailUrl?: string;
  mimeType: string;
  sizeBytes: number;
  priceCents: number;
  metadata: IUniversalMediaMetadata;
  rights: {
    allow_radio: boolean;
    allow_lyrika: boolean;
    allow_remix: boolean;
    allow_commercial: boolean;
    consentForShowcase: boolean;
    consentForMusicSync: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

const MultilingualTextSchema = new Schema({
  fr: { type: String, required: true },
  en: { type: String },
}, { _id: false });

const StudioPermissionsSchema = new Schema({
  allowShowcase: { type: Boolean, default: false },
  allowRadio: { type: Boolean, default: false },
}, { _id: false });

const MetadataSchema = new Schema({
  bpm: { type: Number },
  key: { type: String },
  isStudioProject: { type: Boolean, default: false },
  usedSampleUids: [{ type: String }],
  permissions: { type: StudioPermissionsSchema, default: () => ({}) },
}, { _id: false, strict: false }); // strict: false permet d'accueillir d'autres clés dynamiques libres

const RightsSchema = new Schema({
  allow_radio: { type: Boolean, default: false },
  allow_lyrika: { type: Boolean, default: false },
  allow_remix: { type: Boolean, default: false },
  allow_commercial: { type: Boolean, default: false },
  consentForShowcase: { type: Boolean, default: false },
  consentForMusicSync: { type: Boolean, default: false },
}, { _id: false });

const UniversalMediaSchema = new Schema<IUniversalMediaDocument>(
  {
    mediaId: { type: String, unique: true, sparse: true, index: true },
    creatorUid: { type: String, required: true, index: true },
    creatorSlug: { type: String },
    sourceApp: { 
      type: String, 
      enum: ['PARTITA', 'LETRIN', 'ABYSS', 'DHO', 'GALLERY', 'SPRITE', 'UNKNOWN'], 
      default: 'UNKNOWN',
      index: true 
    },
    type: { 
      type: String, 
      required: true, 
      enum: ['IMAGE', 'AUDIO_TRACK', 'AUDIO_STEM', 'TEXT'],
      index: true
    },
    title: { type: MultilingualTextSchema, required: true },
    description: { type: MultilingualTextSchema },
    
    fileUrl: { type: String, required: true },
    thumbnailUrl: { type: String },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true },
    
    priceCents: { type: Number, default: 0 },
    metadata: { type: MetadataSchema, default: () => ({}) },
    
    rights: { type: RightsSchema, default: () => ({}) },
  },
  {
    timestamps: true,
    collection: 'universal_medias'
  }
);

export const UniversalMediaModel: Model<IUniversalMediaDocument> = 
  models.UniversalMedia || model<IUniversalMediaDocument>('UniversalMedia', UniversalMediaSchema);