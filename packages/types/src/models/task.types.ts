// packages/types/src/models/task.types.ts

export enum TaskStatus {
  CONCEPT = 'CONCEPT',
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  DONE = 'DONE',
  BLOCKED = 'BLOCKED',
  CANCELLED = 'CANCELLED',
  REDUCED_SPEED = 'REDUCED_SPEED',
  ARCHIVED = 'ARCHIVED'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ITask {
  // 🌉 LE PONT (Graphe Muet - Unique source de vérité relationnelle)
  uid: string;
  projectUid: string;
  parentUid?: string | null;
  creatorUid: string;
  assigneeUids: string[]; // 👥 Transformation en tableau pour le travail en escouade
  
  // 🏷️ L'ARCHIVE (Silice Concrète)
  content: {
    title: string;
    description?: string;
    tags: string[];
  };

  status: TaskStatus;
  priority: TaskPriority;

  // ⏳ HORLOGERIE (Le temps volatile)
  pomodoros: {
    estimated: number;
    completed: number;
  };

  // 🧠 MÉTRIQUE
  metrics: {
    complexity: number; // 🩸 CORRECTION : Remplacement de mentalLoad par complexity
  };
  
  // 🪡 SUTURE : Alignement avec la structure globale des artefacts
  documents: {
    uid: string;
    name: string;
    label: string;
    url: string;
    mimeType: string;
    createdAt?: Date;
  }[];

  // 📅 TEMPOREL
  dates: {
    createdAt: Date;
    updatedAt: Date;
    deadline?: Date;
    scheduledAt?: Date | string;
  };
}