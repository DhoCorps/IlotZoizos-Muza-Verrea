// packages/infrastructure/src/models/task.model.ts
import mongoose, { Schema, Document } from 'mongoose';
import { ITask, TaskStatus, TaskPriority } from '@ilot/types';

export type TaskDocument = ITask & Document;

const TaskSchema = new Schema<TaskDocument>({
  uid: { type: String, required: true, unique: true },
  projectId: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  projectUid: { type: String, required: true },
  parentId: { type: Schema.Types.ObjectId, ref: 'Task', default: null },
  parentUid: { type: String, default: null },
  creatorUid: { type: String, required: true },
  assigneeUids: [{ type: String }],
  
  content: {
    title: { type: String, required: true, trim: true },
    description: { type: String },
    tags: [{ type: String }]
  },

  status: { type: String, enum: Object.values(TaskStatus), default: TaskStatus.TODO },
  priority: { type: String, enum: Object.values(TaskPriority), default: TaskPriority.MEDIUM },

  pomodoros: {
    estimated: { type: Number, default: 1 },
    completed: { type: Number, default: 0 }
  },

  metrics: {
    mentalLoad: { type: Number, default: 0, min: 0, max: 100 }
  },

  fileUploads: [{ type: String }], // URLs des fichiers joints

  dates: {
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    deadline: { type: Date }
  }
}, { timestamps: true });

TaskSchema.index({ assigneeUids: 1 });

export const TaskModel = mongoose.models.Task || mongoose.model<TaskDocument>('Task', TaskSchema);