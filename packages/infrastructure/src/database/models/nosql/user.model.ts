// Fichier : packages/infrastructure/src/database/models/nosql/user.model.ts
import mongoose from 'mongoose'; 
import type { Document, Types } from 'mongoose';

const { Schema } = mongoose;

import { v4 as uuidv4 } from 'uuid';
import { IOiseau } from "@ilot/types";

export interface ExternalPaymentProfile {
  externalCustomerId: string;       // ID du client chez le tiers de paiement (ex: Stripe Customer ID)
  defaultPaymentMethodId?: string;  // ID du moyen de paiement par défaut tokenisé
  hasActiveWallet: boolean;         // Indique si l'oiseau a initialisé son espace de paiement
  updatedAt: Date;
}

export interface OiseauDocument extends IOiseau, Document { 
  _id: Types.ObjectId; 
  sanctuaireVerrouille: boolean;
  createdAt: Date;
  // 🔑 Déclaration TS pour éviter les erreurs lors de la mutation du chant
  resetPasswordToken?: string;
  resetPasswordExpires?: number;
}

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

    // 🪡 SUTURE DU MAILLON MANQUANT : Catalogue des Nids physiques rattachés à l'Oiseau
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team', default: [] }],

    // 🛡️ SUTURE : Le champ de pouvoir unifié
    capabilities: { type: [String], default: [] },
    
    entropieActive: { type: Number, default: 100, min: 0, max: 100 },
    isGhostMode: { type: Boolean, default: false },
    isOpenToInvitations: { type: Boolean, default: true },
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