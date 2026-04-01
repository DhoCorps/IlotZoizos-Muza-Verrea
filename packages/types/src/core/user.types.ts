import { z } from 'zod';

/**
 * 🎭 RÔLES & MODES
 */
export const UserStatusSchema = z.enum(['pending', 'active', 'inactive', 'banned']);
export const UserVibeModeSchema = z.enum(['standard', 'ghost']);

/**
 * 🎭 SYSTÈME DE RÔLES DYNAMIQUE
 * Aligné sur la nécessité de gameplay "multi-domaine"
 */
export const RoleItemSchema = z.object({
  uid: z.string(), // UID technique du rôle (Neo4j/Mongo)
  intitule: z.string(),
  status: z.enum(['active', 'deprecated']).default('active'),
  isSystem: z.boolean().default(false),
  domain: z.string().optional(),
});

/**
 * 🏗️ USER SCHEMA (La Source de Vérité Unique)
 */
export const UserSchema = z.object({
  // --- 🌉 IDENTITÉ NÉE DU GRAPH ---
  // On utilise .string() car tes UIDs sont des Hex strings de 24 chars (Mongo), pas des UUIDs.
  uid: z.string(), 
  synapseId: z.string().optional(),
  username: z.string().min(3).max(25),
  name: z.string().optional(),
  email: z.string().email(),
  
  // Validation musclée pour le mot de passe
  password: z.string()
    .min(8, "8 caractères minimum")
    .max(50)
    .regex(/[A-Z]/, "Il faut au moins une majuscule")
    .regex(/[0-9]/, "Il faut au moins un chiffre")
    .regex(/[a-z]/, "Il faut au moins une minuscule")
    .regex(/[!@#$%^&*(),.?":{}|<>]/, "Il faut au moins un caractère spécial")
    .optional(), 
    
  signature: z.string().max(100).optional(),

  // --- 📸 IDENTITÉ VISUELLE ---
  profilePicture: z.string().url().optional(),
  avatarUrl: z.string().url().optional(),
  coverPicture: z.string().url().optional(),

  // --- 📜 DOSSIER D'IDENTITÉ ---
  identity: z.object({
    cvUrl: z.string().url().optional(),
    biography: z.string().max(1000).optional(),
    links: z.array(z.object({
      label: z.string(),
      url: z.string().url()
    })).default([]),
    location: z.string().optional(),
  }).default({}),

  // --- 🎮 FICHE DE PERSONNAGE (Gamification) ---
  characterSheet: z.object({
    jobTitle: z.string().optional(),
    level: z.number().int().min(1).default(1),
    xp: z.number().int().min(0).default(0),
    mood: z.string().default('😐'),
    skills: z.array(z.string()).default([]),
    alignment: z.enum(['lawfull', 'neutral', 'chaotic', 'good', 'evil']).optional(),
  }).default({ level: 1, xp: 0, mood: '😐' }),

  // --- 🚦 ÉTAT & PRÉSENCE ---
  status: UserStatusSchema.default('pending'),
  currentMode: UserVibeModeSchema.default('standard'),
  isOnline: z.boolean().default(false),
  airplaneMode: z.boolean().default(false),
  lastActive: z.date().default(() => new Date()),
  isOpenToInvitations: z.boolean().default(true),

  // --- 🏗️ ÉCOSYSTÈME ---
  // ✅ SUTURE : On utilise maintenant le RoleItemSchema pour le multi-rôle
  role: z.string().default('MEMBRE'),
  roles: z.array(RoleItemSchema).default([]),
  teams: z.array(z.string()).default([]), 
  projects: z.array(z.string()).default([]),

  // --- 🧠 MODULES L'ÎLOT ZOIZOS ---
  moderation: z.object({
    reportCount: z.number().default(0),
    isFlagged: z.boolean().default(false)
  }).default({ reportCount: 0, isFlagged: false }),

  collectiveData: z.object({
    optIn: z.boolean().default(true),
    contributionScore: z.number().default(0)
  }).default({ optIn: true, contributionScore: 0 }),

  wellbeing: z.object({
    mentalLoadScore: z.number().min(0).max(100).default(0),
    lastCheckIn: z.date().optional()
  }).default({ mentalLoadScore: 0 })
});

/**
 * ✅ L'INTERFACE UNIQUE
 * Typage global déduit du schéma pour le Front et le Back
 */
export type IUser = z.infer<typeof UserSchema>;