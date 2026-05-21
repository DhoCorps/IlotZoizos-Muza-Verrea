// apps/hub-central/types/auth.types.ts
import { z } from 'zod';
// ⚠️ Assure-toi d'avoir exporté le schéma Zod de ton utilisateur (ex: OiseauSchema)
// dans ton fichier user.types.ts pour une validation totale.
import { OiseauSchema } from './user.types'; 

/**
 * 🛡️ SUTURE ZODIQUE : Sécurisation de la session utilisateur
 * Garantit que la structure de session injectée dans le contexte est intègre.
 */
export const AuthSessionSchema = z.object({
  user: OiseauSchema, 
  
  // 👥 Capacités extraites au premier niveau pour le composant <RequireCapability />
  capabilities: z.array(z.string()).default([]), 
  
  // 🔐 Métadonnées de sécurité
  accessToken: z.string().optional(),
  expires: z.string(), // Format ISO attendu par NextAuth
});

// 🔄 INFERENCE : Génération automatique du type TypeScript
export type AuthSession = z.infer<typeof AuthSessionSchema>;