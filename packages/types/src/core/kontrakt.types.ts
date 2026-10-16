// Fichier : packages/types/src/models/kontrakt.types.ts
import { z } from 'zod';
import { CurrencyEnum } from '../core/economy.types'; // 🌟 Importation de la SSOT pour les devises
import { GameModeEnum, DifficultyEnum } from '../core/economy.types';

// Le schéma Zod pour la validation stricte des données entrantes
export const KonTrakTSchema = z.object({
  creatorId: z.string().min(1, "L'UID du créateur est requis"),
  gameId: z.string().min(1, "Le jeu ciblé (ex: PlaJia) est requis"),
  gameMode: GameModeEnum, // 🌟 Sécurisé avec l'Enum global
  difficulty: DifficultyEnum, // 🌟 Sécurisé avec l'Enum global
  
  // La mise initiale de l'Oiseau A (ex: 3 Plumes)
  wagerAmount: z.number().positive("La mise doit être supérieure à zéro"),
  wagerCurrency: CurrencyEnum, // 🚀 Intégration de TOX et DHO via l'Enum global
  
  // Le Contrat Scellé : La valeur cristallisée lors de la création
  targetDhOValue: z.number().positive(),
  
  // Le cycle de vie et l'auto-nettoyage
  status: z.enum(['pending', 'accepted', 'resolved', 'expired']).default('pending'),
  expiresAt: z.coerce.date(), // ⏳ Harmonisation Date avec coerce
  
  // Le challenger (Oiseau B) - Rempli uniquement lors de l'acceptation
  acceptedById: z.string().optional(),
  coverCurrency: CurrencyEnum.optional(), // 🚀 Intégration de TOX et DHO ici aussi
  coverAmount: z.number().positive().optional(), // Calculé selon targetDhOValue au moment de l'acceptation
})
// 🛡️ RAJOUT DU BLOC REFINE DIRECTEMENT ICI (Copie de celui de economy.types.ts pour la sécurité du modèle mongoose)
.refine((data) => {
  if ((data.gameMode === 'solo' || data.gameMode === 'SOLO') && (data.wagerCurrency === 'DHO' || data.wagerCurrency === 'TOX')) {
    return false;
  }
  return true;
}, {
  message: "Les devises souveraines (DhÔ / TôX) sont formellement interdites en mode Solo",
  path: ['wagerCurrency']
});

// L'inférence automatique du type TypeScript pour tout le backend
export type IKonTraKt = z.infer<typeof KonTrakTSchema> & {
  _id?: string | unknown; // 🛡️ Remplacement de 'any' par 'unknown' pour un typage strict
  createdAt?: Date;
  updatedAt?: Date;
  save?: () => Promise<unknown>; // Permet d'appeler .save() sur les documents Mongoose récupérés
};