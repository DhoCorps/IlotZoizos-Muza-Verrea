import { z } from 'zod';
import { BaseNodeSchema } from './common.types';

export const BirdRoleSchema = z.enum(['ADMIN', 'MODERATOR', 'BUILDER', 'SPECTATOR']);

export const TeamSchema = BaseNodeSchema.extend({
  name: z.string().min(3).max(50), 
  description: z.string().max(300).optional(),
  avatarUrl: z.string().optional(), // 👈 Oubli réparé
  
  ownerId: z.string(), 
  parentId: z.string().nullable().optional(), 
  leaderId: z.string().nullable().optional(),
  // 🛡️ MODÉRATION : Aligné sur le modèle
  moderation: z.object({
    isFlagged: z.boolean().default(false)
  }).default({ isFlagged: false }),
  
  isPrivate: z.boolean().default(true),

  settings: z.object({
    isGlobalReducedSpeed: z.boolean().default(false),
    allowSearch: z.boolean().default(true),
  }).default({ isGlobalReducedSpeed: false, allowSearch: true }),

  collectiveHealth: z.object({
    averageMentalLoad: z.number().default(0),
    isOverloaded: z.boolean().default(false)
  }).optional()
});

export type ITeam = z.infer<typeof TeamSchema>;

// Pour Neo4j
export interface INestingRelation {
  since: Date;
  role: z.infer<typeof BirdRoleSchema>;
  nicknameInTeam?: string;
}