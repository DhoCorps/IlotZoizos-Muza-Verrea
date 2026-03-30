// models/nosql/message.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { connectToDatabase } from '../../mongoose';

// ⚡ FORCE L'INITIALISATION DE LA CONNEXION
// Cela garantit que dès que le modèle est importé, Mongoose tente de se brancher
connectToDatabase().catch((err: any) => console.error("Erreur d'auto-connexion Mongoose:", err));

export interface IMessage extends Document {
  content: string;
  senderId: string;
  senderName: string;
  contextId: string;   // ID du Projet, de la Tâche ou 'global'
  contextType: 'global' | 'project' | 'task' | 'team';
  mood: 'combat' | 'confort'; // Pour faire parler la posture !
  createdAt: Date;
}

const MessageSchema = new Schema({
  content: { type: String, required: true },
  senderId: { type: String, required: true },
  senderName: { type: String, required: true },
  contextId: { type: String, required: true },
  contextType: { type: String, required: true },
  mood: { type: String, default: 'confort' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);