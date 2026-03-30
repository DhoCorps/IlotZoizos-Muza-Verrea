import mongoose, { Schema, Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { connectToDatabase } from '../../mongoose';

// ⚡ AUTO-CONNEXION : On s'assure que MongoDB est réveillé dès l'import du modèle
connectToDatabase().catch((err: Error) => 
  console.error("🚨 Erreur de connexion MongoDB (Message Model):", err)
);

// 1. L'interface TypeScript
export interface IGraphMessage extends Document {
  uid: string;        // Identifiant unique pour le graphe Neo4j
  userId: string;     // L'UID de l'habitant (DhÖ Master, Sara, etc.)
  content: string;
  context: 'mental_health_discussion' | 'general' | 'support' | 'alert';
  createdAt: Date;
  updatedAt: Date;
}

// 2. Le Schéma Mongoose
const MessageSchema: Schema<IGraphMessage> = new Schema({
  // --- LE PONT NEO4J ---
  uid: { 
    type: String, 
    required: true, 
    unique: true, 
    default: () => uuidv4(),
    index: true 
  },

  // --- L'AUTEUR ---
  userId: { 
    type: String, 
    required: [true, "L'identifiant de l'auteur est obligatoire"],
    index: true 
  },

  // --- CONTENU ---
  content: { 
    type: String, 
    required: [true, "Le message ne peut pas être vide"],
    trim: true 
  },

  // --- CLASSIFICATION ---
  context: { 
    type: String, 
    required: true,
    enum: ['mental_health_discussion', 'general', 'support', 'alert'],
    default: 'general',
    index: true
  }
}, { 
  timestamps: true // Génère automatiquement createdAt et updatedAt
});

// 3. 🛡️ SÉCURITÉ NEXT.JS
// On vérifie si le modèle existe déjà pour éviter l'erreur "OverwriteModelError"
export const Message = mongoose.models.Message || mongoose.model<IGraphMessage>('Message', MessageSchema);

export default IGraphMessage;