import { z } from 'zod';

// Le schéma Zod pour la validation stricte des données entrantes
export const KonTrakTSchema = z.object({
  creatorId: z.string().min(1, "L'UID du créateur est requis"),
  gameId: z.string().min(1, "Le jeu ciblé (ex: PlaJia) est requis"),
  gameMode: z.string().min(1, "Le mode de jeu est requis"), // 👈 Ajouté pour les modes multijoueur/solo
  difficulty: z.enum(['Initiate', 'Artisan', 'Maestro']),
  
  // La mise initiale de l'Oiseau A (ex: 3 Plumes)
  wagerAmount: z.number().positive("La mise doit être supérieure à zéro"),
  wagerCurrency: z.enum(['plumes', 'totamtoes', 'parchemins', 'vinyles', 'sampleNotes']),
  
  // Le Contrat Scellé : La valeur cristallisée lors de la création
  targetDhOValue: z.number().positive(),
  
  // Le cycle de vie et l'auto-nettoyage
  status: z.enum(['pending', 'accepted', 'resolved', 'expired']).default('pending'),
  expiresAt: z.date(), // Le champ surveillé par l'index TTL de MongoDB
  
  // Le challenger (Oiseau B) - Rempli uniquement lors de l'acceptation
  acceptedById: z.string().optional(),
  coverCurrency: z.enum(['plumes', 'totamtoes', 'parchemins', 'vinyles', 'sampleNotes']).optional(),
  coverAmount: z.number().positive().optional(), // Calculé selon targetDhOValue au moment de l'acceptation
});

// L'inférence automatique du type TypeScript pour tout le backend
export type IKonTraKt = z.infer<typeof KonTrakTSchema> & {
  _id: string | unknown; // 🛡️ Remplacement de 'any' par 'unknown' pour un typage strict
  createdAt?: Date;
  updatedAt?: Date;
  save?: () => Promise<unknown>; // Permet d'appeler .save() sur les documents Mongoose récupérés
};