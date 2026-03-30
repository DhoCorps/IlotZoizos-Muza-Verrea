import mongoose, { Schema, Document, Model } from 'mongoose';
import { connectToDatabase } from '../../mongoose';

// ⚡ FORCE L'INITIALISATION DE LA CONNEXION
// Cela garantit que dès que le modèle est importé, Mongoose tente de se brancher
connectToDatabase().catch((err: any) => console.error("Erreur d'auto-connexion Mongoose:", err));

export type ModerationStatus = 'pending' | 'reviewed' | 'resolved' | 'dismissed';
export type TargetType = 'User' | 'Project' | 'Task';

export interface IModeration extends Document {
  targetId: mongoose.Types.ObjectId; // L'ID de ce qui est signalé
  targetType: TargetType;             // Le type (Utilisateur, Projet, Tâche...)
  reporterId: mongoose.Types.ObjectId; // Qui a fait le signalement
  reason: string;                     // Motif du signalement
  details?: string;                   // Précisions supplémentaires
  status: ModerationStatus;           // État du ticket
  moderatorId?: mongoose.Types.ObjectId; // L'admin/modérateur qui traite le cas
  actionTaken?: string;               // Action effectuée (ex: "Bannissement", "Avertissement")
  createdAt: Date;
  updatedAt: Date;
}

const ModerationSchema: Schema<IModeration> = new Schema({
  targetId: { type: Schema.Types.ObjectId as any, required: true, refPath: 'targetType' },
  targetType: { type: String, required: true, enum: ['User', 'Project', 'Task'] },
  reporterId: { type: Schema.Types.ObjectId as any, required: true, ref: 'User' },
  reason: { type: String, required: true },
  details: { type: String },
  status: { 
    type: String, 
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'], 
    default: 'pending' 
  },
  moderatorId: { type: Schema.Types.ObjectId as any, ref: 'User' },
  actionTaken: { type: String }
}, { timestamps: true });

export const ModerationModel: Model<IModeration> = mongoose.models.Moderation || mongoose.model<IModeration>('Moderation', ModerationSchema);