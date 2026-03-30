import { z } from 'zod';
import { UserRole } from './role.types';

/**
 * 🛡️ USER SCHEMA (Zod) - La Source de Vérité
 */
export const UserSchema = z.object({
  uid: z.string(), // Indispensable pour Neo4j
  username: z.string().min(3, "Le nom d'oiseau doit avoir au moins 3 caractères"),
  email: z.string().email("Email invalide"),
  password: z.string().min(8).optional(),
  jobTitle: z.string().optional(),
  name: z.string().optional(),
  avatar: z.string().url().optional().or(z.literal('')),
  
  // Hiérarchie et Droits (Aligné sur ROLE_BADGES)
  role: z.custom<UserRole>().default('BATISSEUR'),
  roles: z.array(z.string()).default([]), 
  status: z.enum(['pending', 'active', 'inactive', 'banned', 'suspended', 'rebirthed']).default('active'),
  
  // --- GAMIFICATION & BIEN-ÊTRE ---
  level: z.number().default(1),
  xp: z.number().default(0),
  mood: z.string().optional(),
  tomatoesHarvested: z.number().default(0),
  
  wellbeing: z.object({
    mentalLoadScore: z.number().min(0).max(100).default(0),
    lastCheckIn: z.union([z.string(), z.date()]).optional(),
  }).default({ mentalLoadScore: 0 }),

  moderation: z.object({
    reportCount: z.number().default(0),
    isFlagged: z.boolean().default(false)
  }).default({ reportCount: 0, isFlagged: false }),

  collectiveData: z.object({
    optIn: z.boolean().default(true),
    contributionScore: z.number().default(0)
  }).default({ optIn: true, contributionScore: 0 }),

  settings: z.record(z.string(), z.any()).default({}),
  
  lastLogin: z.union([z.string(), z.date()]).optional(),
  isOnline: z.boolean().default(false),
  isOpenToInvitations: z.boolean().default(true)
});

/**
 * 👤 L'OISEAU (IUser) - Type Inféré automatiquement depuis Zod !
 */
export type IUser = z.infer<typeof UserSchema>;