// packages/infrastructure/src/models/task.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { ITask, TaskStatus, TaskPriority } from '@ilot/types';

export type TaskDocument = ITask & Document;

const TaskSchema = new Schema<TaskDocument>({
  // 🌉 LE PONT (Graphe Muet)
  uid: { type: String, required: true, unique: true },
  
  // 🩸 PURGE : Suppression de `projectId` et `parentId` (les ObjectId Mongoose).
  // Seuls les UID comptent pour le maillage.
  projectUid: { type: String, required: true, index: true }, 
  parentUid: { type: String, default: null, index: true }, 
  creatorUid: { type: String, required: true },
  assigneeUids: [{ type: String }],
  
  // 🏷️ L'ARCHIVE (Silice Concrète)
  content: {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    tags: [{ type: String }]
  },

  // ⚙️ ÉTATS
  status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO, index: true },
  priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },

  // ⏳ HORLOGERIE (Le temps volatile)
  pomodoros: {
    estimated: { type: Number, default: 1 },
    completed: { type: Number, default: 0 }
  },

  // 🧠 MÉTRIQUE (Optionnelle, par ex: Complexité ressentie)
  metrics: {
    complexity: { type: Number, default: 1, min: 1, max: 10 } // Renommé pour plus de clarté
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
    deadline: { type: Date }
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

// Index pour les recherches rapides côté Silice
TaskSchema.index({ assigneeUids: 1 });
TaskSchema.index({ projectUid: 1, status: 1 }); // Pour charger les kanbans vite

export const TaskModel = mongoose.models.Task || mongoose.model<TaskDocument>('Task', TaskSchema);