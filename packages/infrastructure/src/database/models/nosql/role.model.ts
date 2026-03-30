import mongoose, { Schema, Document, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { IPermission } from './permission.model'; // Le lien magique TS
import { connectToDatabase } from '../../mongoose';

// ⚡ FORCE L'INITIALISATION DE LA CONNEXION
// Cela garantit que dès que le modèle est importé, Mongoose tente de se brancher
connectToDatabase().catch((err: any) => console.error("Erreur d'auto-connexion Mongoose:", err));

export type RoleStatus = 'active' | 'deprecated';

// 1. L'INTERFACE UNIQUE
export interface IRole extends Document {
  uid: string; // Le pont universel vers Neo4j
  intitule: string;
  description?: string;
  status: RoleStatus;
  
  // --- SYSTÈME & PERMISSIONS (Option B) ---
  // On accepte soit les IDs (avant le populate), soit les objets complets (après)
  permissions: mongoose.Types.ObjectId[] | IPermission[]; 
  isSystem: boolean;     // True = Impossible à supprimer (ex: SuperAdmin)
}

// 2. LE SCHÉMA UNIQUE
const RoleSchema: Schema<IRole> = new Schema({
  uid: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => uuidv4() 
  },
  intitule: { 
    type: String, 
    required: true, 
    unique: true,
    trim: true
  },
  description: { type: String },
  status: { 
    type: String, 
    enum: ['active', 'deprecated'], 
    default: 'active' 
  },
  
  // LE LIEN RELATIONNEL MONGODB
  permissions: [{ 
    type: Schema.Types.ObjectId, 
    ref: 'Permission' // Doit correspondre EXACTEMENT au nom dans mongoose.model('Permission', ...)
  }],
  
  isSystem: { type: Boolean, default: false }
}, { timestamps: true });

// 3. L'EXPORT ROBUSTE NEXT.JS (Sans suppression destructrice)
export const RoleModel = (mongoose.models.Role as Model<IRole>) || mongoose.model<IRole>('Role', RoleSchema);

export default RoleModel;