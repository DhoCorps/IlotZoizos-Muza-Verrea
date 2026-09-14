// src/models/UniversHallBeacon.ts

// 1. Import par défaut de l'objet global
import mongoose from 'mongoose';

// 2. Import séparé pour les types (zéro impact au runtime)
import type { Document, Model } from 'mongoose';

// 3. Extraction propre des constructeurs d'exécution
const { Schema, model, models } = mongoose;

import { IAgoraBeacon, AgoraModuleSource } from '@ilot/types';

export interface IAgoraBeaconDocument extends IAgoraBeacon, Document {}

const AgoraBeaconSchema = new Schema<IAgoraBeaconDocument>(
  {
    uid: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    sourceModule: { 
      type: String, 
      required: true, 
      enum: ['POETRIK', 'BIBLIOTEK', 'PARTITA', 'LETRIN', 'SAMPLOTEK', 'ABYSS'],
      index: true 
    },
    entityUid: { 
      type: String, 
      required: true, 
      index: true 
    },
    title: { 
      type: String, 
      required: true 
    },
    slug: { 
      type: String, 
      required: true, 
      unique: true, 
      index: true 
    },
    authorUid: { 
      type: String, 
      required: true, 
      index: true 
    },
    authorSlug: { 
      type: String, 
      required: true 
    },
    summary: { 
      type: String, 
      default: '' 
    },
    tags: { 
      type: [String], 
      index: true 
    },
    resonanceScore: { 
      type: Number, 
      default: 0, 
      index: true 
    },
    metadata: { 
      type: Object, 
      default: {} 
    },
  },
  { 
    timestamps: true 
  }
);

// Indexation textuelle pour la recherche globale sur l'Agora
AgoraBeaconSchema.index({ title: 'text', summary: 'text', tags: 'text' });

export const UniversHallBeaconModel: Model<IAgoraBeaconDocument> =
  mongoose.models.UniversHallBeacon || mongoose.model<IAgoraBeaconDocument>('UniversHallBeacon', AgoraBeaconSchema);