// src/types/univershall.ts

export type AgoraModuleSource = 'POETRIK' | 'BIBLIOTEK' | 'PARTITA' | 'LETRIN' | 'SAMPLOTEK' | 'ABYSS';

export interface IAgoraBeacon {
  uid: string;                      // ex: beacon_poet_123
  sourceModule: AgoraModuleSource;  // D'où vient l'artefact
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