// Fichier : packages/types/src/models/universalComment.types.ts
import { z } from 'zod';
import { EntityTargetEnum, EntityTarget } from './common.types';

// 🌌 Alignement sur la SSOT EntityTargetEnum (permet de commenter toute entité de l'Îlot + réponses 'COMMENT')
export const CommentTargetTypeSchema = EntityTargetEnum;
export type CommentTargetType = EntityTarget;

export const UniversalCommentSchema = z.object({
  uid: z.string().uuid("L'UID du commentaire doit être un UUID valide"),
  authorUid: z.string().uuid("L'UID de l'auteur est requis"),
  
  // Le couple polymorphe
  targetUid: z.string().uuid("L'UID de la cible est requis"),
  targetType: CommentTargetTypeSchema,
  
  // Pour l'arborescence infinie (si c'est une réponse, on garde l'ID du parent direct)
  parentId: z.string().uuid().optional(),
  
  content: z.string()
    .min(1, "Un écho ne peut être vide")
    .max(3000, "Le Kosmos limite les discours à 3000 caractères"),
  
  // Mécaniques de contrôle souverain
  allowComments: z.boolean().default(true),
  allowReactions: z.boolean().default(true),
  
  // Mécanique d'Invisibilité Kosmique (le joueur masque son commentaire)
  isHidden: z.boolean().default(false),

  // 🌟 Le Sceau de l'Érudit (Extraction SEO pour la section "Échos Remarquables")
  isScholarSealed: z.boolean().default(false),

  createdAt: z.coerce.date().optional(), // ⏳ Harmonisation Date avec coerce
  updatedAt: z.coerce.date().optional(), // ⏳ Harmonisation Date avec coerce
});

export type UniversalComment = z.infer<typeof UniversalCommentSchema>;