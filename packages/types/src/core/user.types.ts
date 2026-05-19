// Fichier : @ilot/types/index.ts
import { z } from 'zod';

/**
 * 🌌 CONSTANTES & ÉQUATIONS DE L'ÎLOT
 * L'utilisateur n'est plus défini par un métier ou un niveau, mais par sa fréquence.
 */

// 🌱 I. LA GRAINE (Ce qui est incompressible et identitaire)
export const OiseauSeedSchema = z.object({
  uid: z.string(), 
  pseudo: z.string().min(3).max(30), // L'identité chantée
  email: z.string().email(),
  password: z.string().min(8).optional(),
  
  // Le Color Picker ! Un code Hexadécimal pour l'écologie visuelle (ex: Gris Bleuté / Rouge sombre)
  frequenceHEX: z.string().regex(/^#([0-9A-F]{3}){1,2}$/i).default('#2F4F4F'), 

  // --- NOUVEAUX ATTRIBUTS (Identité Visuelle et Compétences) ---
  avatarUrl: z.string().url().optional().nullable(),
  coverPicture: z.string().url().optional().nullable(),
  
  // L'Aura : L'énergie dégagée par l'Oiseau (ex: ["TypeScript", "Designer", "Balrog"])
  capabilities: z.array(z.string()).default([]),
});

// 🌿 II. LE SANCTUAIRE (La Liberté Polymorphe et l'État d'Âme)
export const OiseauLeafSchema = z.object({
  // Fini le CV, le profil RPG ou l'autel pré-formaté. 
  // L'utilisateur injecte l'objet JSON qu'il veut.
  sanctuaire: z.record(z.any()).default({}), 
  
  // --- NOUVEL ATTRIBUT (Le Verrou) ---
  // L'Anneau de Sauron : Protection ultime de la santé mentale de l'utilisateur
  sanctuaireVerrouille: z.boolean().default(false),

  // L'Entropie remplace la charge mentale. Si elle tombe à 0, le Caprice s'active.
  entropieActive: z.number().min(0).max(100).default(100),
  
  // Le statut de stase ou d'envol
  isGhostMode: z.boolean().default(false),
  isOpenToInvitations: z.boolean().default(true),

  // 🪡 SUTURE DU MAILLON MANQUANT : Collection des Références de Nids rattachés à l'Oiseau
  teams: z.array(z.any()).default([]),
});

// 🏗️ III. L'OISEAU COMPLET
// L'Oiseau est la fusion de sa Graine (Identité) et de son Sanctuaire (État)
export const OiseauSchema = OiseauSeedSchema.merge(OiseauLeafSchema);

// ✨ TYPESCRIPT : Extraction automatique !
// Plus besoin de taper les interfaces à la main, Zod s'en charge.
export type IOiseau = z.infer<typeof OiseauSchema>;
export type ISeed = z.infer<typeof OiseauSeedSchema>;