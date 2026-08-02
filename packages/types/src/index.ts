export * from './core/permission.types';
export * from './core/user.types';
export * from './core/auth.schema';
export * from './core/auth';
export * from './models/common.types';
export * from './models/moderation.types';
export * from './models/team.types';
export * from './models/project.types';
export * from './models/task.types';
export * from './models/status.types';
export * from './models/sujet.types';
export * from './models/resonance.types';

export interface ActionSignature {
  actorUid: string;       
  capabilities: string[];
  issuedAt?: Date; 
}