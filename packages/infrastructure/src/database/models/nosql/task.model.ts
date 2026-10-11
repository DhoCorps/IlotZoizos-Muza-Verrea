import mongoose from 'mongoose';
import type { Document, Model } from 'mongoose';

const { Schema } = mongoose;

import { ITask, TaskStatus, TaskPriority } from '@ilot/types';
import { SeveEngine } from '../../../../../shared-core/src/utils/seve.engine';
import { TaskIrrigationOrchestrator } from '../../../../../shared-core/src/sync-engine/task.irrigation.orchestrator';
import { OiseauModel } from './user.model';

/**
 * 🏗️ TASK DOCUMENT (Typage strict basé sur Zod)
 */
export interface ITaskDocument extends Omit<ITask, '_id' | 'dates'>, Document {
  // 🪡 Suture : Mongoose gère les dates nativement, on override les types Zod (String/Date)
  dates: {
    createdAt?: Date;
    updatedAt?: Date;
    deadline?: Date;
    scheduledAt?: Date | null;
    completedAt?: Date | null;
  };
}

const TaskSchema = new Schema<ITaskDocument>({
  // 🌉 LE PONT (Graphe Muet)
  uid: { type: String, required: true, unique: true },
  
  projectUid: { type: String, required: true, index: true }, 
  parentUid: { type: String, default: null, index: true }, 
  creatorUid: { type: String, required: true },
  assigneeUids: [{ type: String }],
  
  // 🏷️ L'ARCHIVE (Silice Concrète)
  content: {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    tags: [{ type: String }],
    attachments: [{ type: String }]
  },

  fileUploads: [{ type: String }],

  // 🕸️ MAILLAGE TRANSVERSAL (KaÔdZ)
  connections: {
    targetModule: { type: String, default: null },
    targetEntityUid: { type: String, default: null }
  },

  // ⚙️ ÉTATS (Alignés sur la SSOT Zod)
  status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO, index: true },
  priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },

  // 🌱 LA SÈVE : Les racines et la Loi de l'Irrigation (It)
  dependencies: [{
    id: { type: String, required: true },
    status: { type: Number, enum: [0, 1], required: true }
  }],
  isIrrigated: { type: Number, default: 1 },

  // ⏳ HORLOGERIE (Le temps volatile)
  pomodoros: {
    estimated: { type: Number, default: 1 },
    completed: { type: Number, default: 0 }
  },

  // 🧠 MÉTRIQUE
  metrics: {
    complexity: { type: Number, default: 1, min: 1, max: 10 }
  },

  documents: [{
    uid: { type: String, required: true },
    name: { type: String, required: true },
    label: { type: String },
    url: { type: String, required: true },
    mimeType: { type: String },
    createdAt: { type: Date, default: Date.now }
  }],

  dates: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deadline: { type: Date },
    scheduledAt: { type: Date },
    completedAt: { type: Date }
  }
}, { 
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_, ret: Record<string, any>) => { 
      delete ret._id; 
      delete ret.__v;
      return ret;
    }
  }
});

// 🛡️ Suture Mongoose : Application directe de l'Orchestrateur & SeveEngine
TaskSchema.pre('save', async function (next) {
  // 1. Loi de l'Irrigation (It)
  if (this.dependencies && this.dependencies.length > 0) {
    const sanitized = TaskIrrigationOrchestrator.evaluateAndSanitize({
      title: this.content?.title || 'Tâche sans titre',
      status: this.status as any,
      dependencies: this.dependencies.map((d: any) => ({ id: d.id, status: d.status })),
      isIrrigated: this.isIrrigated ?? 1
    });

    this.isIrrigated = sanitized.isIrrigated ?? 1;
    if (sanitized.status === 'ROMPU') {
      this.isIrrigated = 0;
      this.status = TaskStatus.ROMPU; // Mise à jour de sécurité locale
    }
  }

  // 2. Équation de la Résonance (Rz) via le SeveEngine lors de l'accomplissement (DONE)
  if (this.isModified('status') && this.status === TaskStatus.DONE) {
    const estimated = this.pomodoros?.estimated || 1;
    const realTime = this.pomodoros?.completed > 0 ? this.pomodoros.completed : estimated;
    const weight = this.metrics?.complexity || 1;

    // Appel direct aux mathématiques pures du SeveEngine
    const rzScore = SeveEngine.calculateResonance([{
      estimatedTime: estimated,
      realTime: realTime,
      weight: weight
    }]);

    console.log(`✨ [Résonance] Tâche "${this.content?.title}" achevée. Score Rz calculé : ${rzScore}`);

    // Propagation de la sève vers l'Oiseau
    if (this.creatorUid) {
      await OiseauModel.updateOne(
        { uid: this.creatorUid },
        { $inc: { globalResonance: rzScore } }
      ).catch(err => console.error("⚠️ Erreur lors de l'imputation de la résonance à l'Oiseau:", err));
    }
  }

  next();
});

TaskSchema.index({ assigneeUids: 1 });
TaskSchema.index({ projectUid: 1, status: 1 });
// Nouvel index pour optimiser les requêtes transversales
TaskSchema.index({ 'connections.targetEntityUid': 1 }); 

export const TaskModel = (mongoose.models.Task as Model<ITaskDocument>) || mongoose.model<ITaskDocument>('Task', TaskSchema);