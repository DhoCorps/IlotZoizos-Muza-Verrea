// packages/infrastructure/src/database/models/nosql/sujet.model.ts

import mongoose, { Schema, Document, Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { ISujet, SujetCategorySchema, SujetStatusSchema } from '@ilot/types'; 

/**
 * SUJET DOCUMENT (La Silice)
 * On étend l'interface ISujet (Zod purifié) avec les propriétés système Mongoose.
 */
export interface ISujetDocument extends Omit<ISujet, '_id'>, Document {
  _id: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SujetSchema = new Schema<ISujetDocument>(
  {
    // --- LE PONT NEO4J (Le Graphe Muet) ---
    uid: {
      type: String,
      required: true,
      unique: true,
      default: () => uuidv4(),
      index: true
    },

    // --- IDENTITÉ & CONTENU ---
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    content: { type: String, required: true }, // Le corps du monologue, du code ou du poème
    
    // Le créateur (Oiseau) qui porte cette parole
    authorUid: { type: String, required: true, index: true },

    // --- VIBRATION & ÉTAT ---
    category: {
      type: String,
      enum: SujetCategorySchema.options,
      default: 'MONOLOGUE'
    },
    status: {
      type: String,
      enum: SujetStatusSchema.options,
      default: 'DRAFT',
      index: true
    },
    tags: [{ type: String, index: true }],

    // --- LE TISSU CONNECTEUR (Silice locale pour le SSR Next.js) ---
    // Bien que Neo4j trace ces relations, on garde des UIDs ici 
    // pour un affichage rapide des fiches produits ou mini-jeux attachés.
    connections: {
      relatedProjects: [{ type: String }],
      relatedTasks: [{ type: String }],
      relatedProducts: [{ type: String }],
      relatedGames: [{ type: String }]
    },

    // --- MÉDIAS & ANCRAGES SENSORIELS ---
    media: {
      coverImageUrl: { type: String },
      // L'endroit idéal pour poser les morceaux de ton enregistreur (Basse, Mélodica...)
      audioTrackUrl: { type: String } 
    },

    // --- GOUVERNANCE & MODÉRATION COLLECTIVE ---
    settings: {
      allowComments: { type: Boolean, default: true },
      allowEmojiReactions: { type: Boolean, default: true },
      isAgeRestricted: { type: Boolean, default: false }
    },

    // --- STATISTIQUES (La Résonance) ---
    resonance: {
      views: { type: Number, default: 0 },
      readsCompleted: { type: Number, default: 0 }
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index textuel pour la barre de recherche globale (allowSearch: true)
SujetSchema.index({ title: 'text', content: 'text', tags: 'text' });

export const SujetModel = (mongoose.models.Sujet as Model<ISujetDocument>) || 
                          mongoose.model<ISujetDocument>('Sujet', SujetSchema);