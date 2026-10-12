// Fichier : packages/types/src/models/univershall.types.ts
import { z } from 'zod';
import { EntityTargetEnum, EntityTarget } from './common.types';

// 🌌 Alignement sur la SSOT EntityTargetEnum (couvre POETRIK, BIBLIOTEK, PARTITA, LETRIN, SAMPLOTEK, ABYSS et tout module de l'Îlot)
export const AgoraModuleSourceSchema = EntityTargetEnum;
export type AgoraModuleSource = EntityTarget;

export interface IAgoraBeacon {
  uid: string;                      // ex: beacon_poet_123
  sourceModule: AgoraModuleSource;  // D'où vient l'artefact (SSOT EntityTarget)
  entityUid: string;                // L'UID de l'objet source (ex: poème, livre, partition)
  title: string;                    // Le titre affiché sur la place
  slug: string;                     // Empreinte URL unique
  authorUid: string;                // L'Oiseau créateur
  authorSlug: string;
  summary: string;                  // Brève description ou premier vers
  tags: string[];                   // Étiquettes thématiques et phonétiques
  resonanceScore: number;           // Indice de vibration / popularité sur l'Îlot
  metadata: Record<string, any>;    // Données libres (ex: IPA, gamme musicale, format)
  createdAt: Date;
}

export const AgoraBeaconSchema = z.object({
  uid: z.string().min(1, "L'UID de la balise est requis."),
  sourceModule: AgoraModuleSourceSchema,
  entityUid: z.string().min(1, "L'UID de l'entité source est requis."),
  title: z.string().min(1, "Le titre est requis."),
  slug: z.string().min(1, "Le slug est requis."),
  authorUid: z.string().min(1, "L'UID de l'auteur est requis."),
  authorSlug: z.string().min(1, "Le slug de l'auteur est requis."),
  summary: z.string().default(''),
  tags: z.array(z.string()).default([]),
  resonanceScore: z.number().default(0),
  metadata: z.record(z.unknown()).default({}),
  createdAt: z.coerce.date().default(() => new Date()),
});