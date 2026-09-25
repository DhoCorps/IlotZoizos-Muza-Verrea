// Fichier : packages/infrastructure/src/database/models/nosql/oiseau.model.ts
import mongoose from 'mongoose';
import type { Document, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IOiseau } from "@ilot/types";

const { Schema } = mongoose;

export interface ExternalPaymentProfile {
  externalCustomerId: string;       // ID du client chez le tiers de paiement (ex: Stripe Customer ID)
  defaultPaymentMethodId?: string;  // ID du moyen de paiement par défaut tokenisé
  hasActiveWallet: boolean;         // Indique si l'oiseau a initialisé son espace de paiement
  updatedAt: Date;
}

export type AccountStatus = 'ACTIVE' | 'UNDER_JUDGMENT' | 'EXILED';
export type KarmaStatus = 'clear' | 'muted' | 'quarantined' | 'banned';
export type ProfileStatus = 'RESPECTABLE' | 'NEUTRAL' | 'INDESIRABLE';

export interface OiseauDocument extends IOiseau, Document { 
  _id: Types.ObjectId; 
  sanctuaireVerrouille: boolean;
  createdAt: Date;
  
  // 🔑 Déclaration TS pour éviter les erreurs lors de la mutation du chant
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
  
  // ⚖️ SUTURE JUSTICE : Tribunal du KaÔdz & 3 Grâces
  praisesCount: number;
  accountStatus: AccountStatus;
  karmaStatus: KarmaStatus;
  strikes: number;
  gracesUsed: number;

  // 🛡️ SUTURE MODÉRATION : Douane Vibratoire & Tribunal de la Canopée
  isBanned: boolean;
  profileStatus: ProfileStatus;
}

// 💼 SOUS-SCHÉMAS DU PROFIL PROFESSIONNEL (SSOT)
const ExperienceSchema = new Schema({
  uid: { type: String, default: () => uuidv4() },
  title: { type: String, required: true },
  company: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  description: { type: String },
  isVisibleInCv: { type: Boolean, default: true } // 👁️ Option pour masquer cette ligne des CV générés
}, { _id: false });

const EducationSchema = new Schema({
  uid: { type: String, default: () => uuidv4() },
  degree: { type: String, required: true },
  institution: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  description: { type: String },
  isVisibleInCv: { type: Boolean, default: true } // 👁️ Option d'affichage sélectif
}, { _id: false });

const LanguageSchema = new Schema({
  language: { type: String, required: true },
  proficiency: { type: String, enum: ['NATIVE', 'FLUENT', 'INTERMEDIATE', 'BEGINNER'], default: 'INTERMEDIATE' }
}, { _id: false });

const CvProfileSchema = new Schema({
  catchphrase: { type: String, maxlength: 300 },
  professionalStatus: { 
    type: String, 
    enum: ['FREELANCE', 'EMPLOYEE', 'JOB_SEEKER', 'STUDENT', 'ENTREPRENEUR', 'OTHER'], 
    default: 'EMPLOYEE' 
  },
  remotePreference: { 
    type: String, 
    enum: ['FULL_REMOTE', 'HYBRID', 'ON_SITE', 'FLEXIBLE'], 
    default: 'FLEXIBLE' 
  },
  
  // 💰 Spécifique aux Freelances
  freelanceDailyRateCents: { type: Number, min: 0 },
  isRateNegotiable: { type: Boolean, default: false },
  
  // 📆 Disponibilité
  availabilityDate: { type: Date },

  // 📚 Les Fondations Classiques
  experiences: { type: [ExperienceSchema], default: [] },
  educations: { type: [EducationSchema], default: [] },
  hobbies: { type: [String], default: [] },
  languages: { type: [LanguageSchema], default: [] },
  portfolioUrls: { type: [String], default: [] }, // Liens vers GitHub, Dribbble, etc.

  // 🎲 LE SUPERFLU NÉCESSAIRE (Flavor RPG de l'Îlot)
  kryptonite: { type: String, maxlength: 150 }, // ex: "Les réunions de 2h qui auraient pu être un email."
  workSoundtrack: { 
    type: String, 
    enum: ['LOFI', 'SYNTHWAVE', 'METAL', 'CLASSICAL', 'SILENCE', 'PODCASTS', 'NATURE'], 
    default: 'LOFI' 
  },
  alignment: { // L'alignement moral D&D pour le fun
    type: String, 
    enum: ['LAWFUL_GOOD', 'NEUTRAL_GOOD', 'CHAOTIC_GOOD', 'LAWFUL_NEUTRAL', 'TRUE_NEUTRAL', 'CHAOTIC_NEUTRAL', 'LAWFUL_EVIL', 'NEUTRAL_EVIL', 'CHAOTIC_EVIL'], 
    default: 'TRUE_NEUTRAL' 
  }
}, { _id: false });


const OiseauSchema = new Schema<OiseauDocument>(
  {
    uid: { type: String, required: true, unique: true, default: () => uuidv4(), index: true },
    pseudo: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true, select: false },
    password: { type: String, select: false },
    frequenceHEX: { type: String, default: '#2F4F4F' },

    nickname: { type: String, sparse: true, trim: true },
    nicknameIsLocked: { type: Boolean, default: true },

    // 🔑 SUTURE : Les champs vitaux pour la réinitialisation du mot de passe
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Number },

    sanctuaire: { type: Schema.Types.Mixed, default: {} },
    sanctuaireVerrouille: { type: Boolean, default: false },
    
    // 💼 SUTURE CV : Le Profil RH Centralisé (Single Source of Truth)
    cvProfile: { type: CvProfileSchema },

    // 🪡 SUTURE DU MAILLON MANQUANT : Catalogue des Nids physiques rattachés à l'Oiseau
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team', default: [] }],

    // 🛡️ SUTURE : Le champ de pouvoir unifié (L'Aura / Les Skills)
    capabilities: { type: [String], default: [] },
    
    entropieActive: { type: Number, default: 100, min: 0, max: 100 },
    isGhostMode: { type: Boolean, default: false },
    isOpenToInvitations: { type: Boolean, default: true },
    
    // ⚖️ SUTURE JUSTICE : Le Compteur d'Éloges, Statut et les 3 Grâces
    praisesCount: { type: Number, default: 0 },
    accountStatus: { 
      type: String, 
      enum: ['ACTIVE', 'UNDER_JUDGMENT', 'EXILED'], 
      default: 'ACTIVE' 
    },
    karmaStatus: {
      type: String,
      enum: ['clear', 'muted', 'quarantined', 'banned'],
      default: 'clear',
      required: true
    },
    strikes: { type: Number, default: 0 },
    gracesUsed: { type: Number, default: 0, max: 3 },

    // 🛡️ SUTURE MODÉRATION : Intégration des attributs de la Douane Vibratoire
    isBanned: { type: Boolean, default: false },
    profileStatus: { 
      type: String, 
      enum: ['RESPECTABLE', 'NEUTRAL', 'INDESIRABLE'], 
      default: 'RESPECTABLE' 
    },

    documents: [{
      uid: { type: String, required: true },
      name: { type: String, required: true },
      label: { type: String },
      url: { type: String, required: true },
      mimeType: { type: String },
      createdAt: { type: Date, default: Date.now }
    }]
  },
  { timestamps: true }
);

OiseauSchema.pre('save', function(next) {
  if (this.isModified('frequenceHEX') && this.frequenceHEX.toUpperCase() === '#2F4F4F') {
    this.isGhostMode = true;
  }

  if (this.entropieActive <= 0 && !this.sanctuaireVerrouille) {
    this.sanctuaire = { 
      message_systeme: "Votre structure est retournée à la poussière. Reposez-vous." 
    };
    this.sanctuaireVerrouille = true;
    this.isOpenToInvitations = false;
  }
  next();
});

export const OiseauModel = mongoose.models.Oiseau || mongoose.model<OiseauDocument>('Oiseau', OiseauSchema);