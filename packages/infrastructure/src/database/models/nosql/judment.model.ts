import mongoose, { Schema, Document } from 'mongoose';

export type JudgmentStatus = 
  | 'PENDING' // En cours de conciliation
  | 'RESOLVED_BY_PEACE' // Le plaignant a retiré son signalement
  | 'EXECUTED_BY_ACCUSER' // Le plaignant a confirmé l'exil
  | 'EXPIRED_ACCUSED_GHOST' // L'accusé n'a pas répondu sous 72h (Exil automatique)
  | 'EXPIRED_ACCUSER_GHOST' // Le plaignant n'a pas répondu sous 72h (Relaxe automatique)
  | 'BOOMERANG_INVOKED'; // Appel à l'Arbitrage (pour punir une calomnie)

export interface IJudgmentMessage {
  senderUid: string;
  content: string;
  sentAt: Date;
}

export interface IJudgment extends Document {
  disputeUid: string;
  accuserUid: string; // Celui qui signale
  accusedUid: string; // Celui qui est signalé
  status: JudgmentStatus;
  
  // ⏳ La mécanique du Sablier Dynamique
  lastInteractionAt: Date; // Date du dernier message ou de l'ouverture
  lastActorUid: string; // Celui qui a parlé en dernier (pour savoir qui est en tort si le temps s'écoule)
  
  messages: IJudgmentMessage[]; // Historique de la conciliation
  
  createdAt: Date;
  updatedAt: Date;
}

const JudgmentMessageSchema = new Schema<IJudgmentMessage>({
  senderUid: { type: String, required: true },
  content: { type: String, required: true },
  sentAt: { type: Date, default: Date.now }
}, { _id: false });

const JudgmentSchema = new Schema<IJudgment>({
  disputeUid: { type: String, required: true, unique: true, index: true },
  accuserUid: { type: String, required: true, index: true },
  accusedUid: { type: String, required: true, index: true },
  status: { 
    type: String, 
    enum: [
      'PENDING', 
      'RESOLVED_BY_PEACE', 
      'EXECUTED_BY_ACCUSER', 
      'EXPIRED_ACCUSED_GHOST', 
      'EXPIRED_ACCUSER_GHOST', 
      'BOOMERANG_INVOKED'
    ], 
    default: 'PENDING' 
  },
  
  // ⏳ Sablier Dynamique
  lastInteractionAt: { type: Date, default: Date.now },
  lastActorUid: { type: String, required: true }, // À l'initialisation, c'est l'accuserUid
  
  messages: [JudgmentMessageSchema]

}, { timestamps: true });

// Index composé pour s'assurer qu'un plaignant ne spamme pas un même oiseau de litiges
JudgmentSchema.index({ accuserUid: 1, accusedUid: 1, status: 1 });

export const JudgmentModel = mongoose.models.Judgment || mongoose.model<IJudgment>('Judgment', JudgmentSchema);