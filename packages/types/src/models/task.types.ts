// packages/types/src/models/task.types.ts

export enum TaskStatus {
  TODO = '?',
  DOING = '...',
  DONE = '!',
  BLOCKED = 'B',
  CANCELLED = 'X'
}

export enum TaskPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface ITask {
  _id?: any;
  uid: string;
  projectId: any;
  projectUid: string;
  parentId?: any;
  parentUid?: string;
  creatorUid: string;
  assigneeUids: string[]; // 👥 Transformation en tableau pour le travail en escouade
  
  content: {
    title: string;
    description?: string;
    tags: string[];
  };

  status: TaskStatus;
  priority: TaskPriority;

  pomodoros: {
    estimated: number;
    completed: number;
  };

  metrics: {
    mentalLoad: number;
  };

  fileUploads: string[];

  dates: {
    createdAt: Date;
    updatedAt: Date;
    deadline?: Date;
  };
}