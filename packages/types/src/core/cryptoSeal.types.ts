// Fichier : packages/types/src/core/cryptoSeal.types.ts

import { z } from 'zod';
import { CopyrightMetadataSchema } from './copyright.types'; // 🚀 L'import du Pacte unifié

// ==========================================
// SCEAU CRYPTOGRAPHIQUE (Le Serment de la Silice)
// ==========================================
export const CryptographicSealSchema = z.object({
  uid: z.string().uuid("L'UID du sceau doit être un UUID valide").optional(),
  
  // L'empreinte immuable
  digitalSignature: z.string().min(1, "Le hash de la signature numérique est requis"),
  
  // L'ancrage temporel
  timestampedAt: z.coerce.date({
    required_error: "La date d'ancrage est requise pour le sceau",
    invalid_type_error: "Format de date invalide pour le timestamp"
  }),
  
  // 🚀 Remplacement de l'ancien booléen `copyrightClaimed` par le système juridique complet
  copyrightMetadata: CopyrightMetadataSchema.optional(),

  // L'identité de l'Oiseau ayant apposé le sceau (pour la traçabilité Neo4j/Mongo)
  sealedByUid: z.string().optional()
});

// Inférence automatique du type pour TypeScript
export type ICryptographicSeal = z.infer<typeof CryptographicSealSchema>;