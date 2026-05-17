// packages/types/src/permissions.types.ts
import { z } from 'zod';

// 🔥 LES PARTICULES ÉLÉMENTAIRES (Les vraies capacités mécaniques)
export const CAPABILITIES = {
  TEAM: { CREATE: 'team:create', READ: 'team:read', UPDATE: 'team:update', DELETE: 'team:delete', MANAGE: 'team:manage-members' },
  MEMBER: { INVITE: 'member:invite', READ: 'member:read', LIST: 'member:list', UPDATE: 'member:update', EXILE: 'member:exile' },
  PROJECT: { CREATE: 'project:create', READ: 'project:read', UPDATE: 'project:update', DELETE: 'project:delete', ARCHIVE: 'project:archive' },
  TASK: { CREATE: 'task:create', READ: 'task:read', UPDATE: 'task:update', DELETE: 'task:delete', MOVE: 'task:move' },
  FILE: { UPLOAD: 'file:upload', READ: 'file:read', UPDATE: 'file:update', DOWNLOAD: 'file:download', BURN: 'file:burn' },
  SYSTEM: { MONITOR: 'wellbeing:monitor', MODERATE: 'moderation:execute', ALL: '*' }
} as const;

// Un simple validateur Zod pour s'assurer qu'une permission envoyée existe bien
export const CapabilitySchema = z.string(); 
export type Capability = z.infer<typeof CapabilitySchema>;

// --- INTERFACE DE VISUALISATION (Pour ton interface React) ---
// On garde ça uniquement pour que ton interface puisse afficher des cases à cocher 
// bien rangées par catégorie quand le créateur forge la clé d'un oiseau.

export interface PowerLevelGroup {
  label: string;
  description?: string;
  capabilities: string[];
}

export const POWER_LEVELS: Record<string, PowerLevelGroup> = {
  TEAM: { 
    label: 'Administration du Nid', 
    capabilities: [CAPABILITIES.TEAM.CREATE, CAPABILITIES.TEAM.READ, CAPABILITIES.TEAM.UPDATE, CAPABILITIES.TEAM.DELETE, CAPABILITIES.TEAM.MANAGE] 
  },
  MEMBER: { 
    label: 'Gestion de la Volée', 
    capabilities: [CAPABILITIES.MEMBER.INVITE, CAPABILITIES.MEMBER.READ, CAPABILITIES.MEMBER.LIST, CAPABILITIES.MEMBER.UPDATE, CAPABILITIES.MEMBER.EXILE] 
  },
  PROJECT: { 
    label: 'Fragments (Projets)', 
    capabilities: [CAPABILITIES.PROJECT.CREATE, CAPABILITIES.PROJECT.READ, CAPABILITIES.PROJECT.UPDATE, CAPABILITIES.PROJECT.DELETE, CAPABILITIES.PROJECT.ARCHIVE] 
  },
  TASK: { 
    label: 'Tâches Opérationnelles', 
    capabilities: [CAPABILITIES.TASK.CREATE, CAPABILITIES.TASK.READ, CAPABILITIES.TASK.UPDATE, CAPABILITIES.TASK.DELETE, CAPABILITIES.TASK.MOVE] 
  },
  FILE: { 
    label: 'Archives & Fichiers', 
    capabilities: [CAPABILITIES.FILE.UPLOAD, CAPABILITIES.FILE.READ, CAPABILITIES.FILE.UPDATE, CAPABILITIES.FILE.DOWNLOAD, CAPABILITIES.FILE.BURN] 
  }
};

// 🩸 SUPPRESSION TOTALE DE `ROLE_PRESETS` ET DE `RelationalRole`.
// Plus d'Administrateur, plus de Bâtisseur. Seulement des Oiseaux avec des listes de capacités.