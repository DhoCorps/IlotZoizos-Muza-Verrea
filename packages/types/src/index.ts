export * from './core/storage.types';
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
export * from './models/partita.types';
export * from './models/letrinSprite.types';
export * from './core/kontakt.types';
export * from './core/ecommerce.types';
export * from './core/gameHistory.types';
export * from './models/message.types';
export * from './models/quizz.types';
export * from './core/payment.types';
export * from './core/showcase.types';
export * from './models/sample.types';
export * from './validation/sampleSchema'

export interface ActionSignature {
  actorUid: string;       
  capabilities: string[];
  issuedAt?: Date; 
}