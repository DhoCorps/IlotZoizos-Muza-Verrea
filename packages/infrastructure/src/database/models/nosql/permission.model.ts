import { v4 as uuidv4 } from 'uuid';
import { Schema, model, models, Document, Model } from 'mongoose';
import { CAPABILITIES } from "@ilot/types";

// 💡 On définit un type basé sur les valeurs de l'objet CAPABILITIES pour plus de précision
type CapabilityValue = typeof CAPABILITIES[keyof typeof CAPABILITIES];

export interface IPermission extends Document {
  uid: string;
  intitule: string;
  description?: string;
  code: CapabilityValue;
}

// 1. On extrait d'abord toutes les valeurs de strings de ton objet imbriqué
const allCapabilities = Object.values(CAPABILITIES).flatMap(group => 
  Object.values(group)
) as string[];

const PermissionSchema = new Schema<IPermission>({
  uid: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => uuidv4() 
  },
  intitule: { 
    type: String, 
    required: true 
  },
  description: { 
    type: String 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    // ✅ On donne maintenant un tableau simple de strings à Mongoose
    enum: allCapabilities 
  }
}, { 
  timestamps: true 
});
export const PermissionModel = (models.Permission as Model<IPermission>) || 
                                model<IPermission>('Permission', PermissionSchema);