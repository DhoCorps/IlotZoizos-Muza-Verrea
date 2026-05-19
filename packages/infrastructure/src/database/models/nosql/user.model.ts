// Fichier : models/Oiseau.ts
import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import { IOiseau } from "@ilot/types";

export interface OiseauDocument extends IOiseau, Document { 
  _id: mongoose.Types.ObjectId; 
  sanctuaireVerrouille: boolean;
  createdAt: Date;
}

const OiseauSchema = new Schema<OiseauDocument>(
  {
    uid: { type: String, required: true, unique: true, default: () => uuidv4(), index: true },
    pseudo: { type: String, required: true, unique: true, trim: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, index: true, select: false },
    password: { type: String, select: false },
    frequenceHEX: { type: String, default: '#2F4F4F' },

    sanctuaire: { type: Schema.Types.Mixed, default: {} },
    sanctuaireVerrouille: { type: Boolean, default: false },

    // 🪡 SUTURE DU MAILLON MANQUANT : Catalogue des Nids physiques rattachés à l'Oiseau
    teams: [{ type: Schema.Types.ObjectId, ref: 'Team', default: [] }],

    // 🛡️ SUTURE : Le champ de pouvoir unifié
    capabilities: { type: [String], default: [] },
    // ⚠️ À SUPPRIMER après ton renommage global
    
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