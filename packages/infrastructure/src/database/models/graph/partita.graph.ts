/**
 * 🎸 LA STRUCTURE DU NŒUD PARTITA DANS NEO4J
 */
export interface IPartitaGraphNode {
  uid: string;
  title: string;
  instrument: string;
  format: string;
  visibility: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

/**
 * 🔗 LES RELATIONS FONDAMENTALES DE LA PARTITA
 * - (:Oiseau {uid}) -[:COMPOSED]-> (:Partita {uid})
 * - (:Partita {uid}) -[:LINKED_TO_PROJECT]-> (:Project {uid})
 * - (:Partita {uid}) -[:OFFERS_PRODUCT]-> (:Product {uid})
 */
export enum PartitaRelationshipType {
  COMPOSED = 'COMPOSED',
  LINKED_TO_PROJECT = 'LINKED_TO_PROJECT',
  OFFERS_PRODUCT = 'OFFERS_PRODUCT'
}

export interface IPartitaGraphContext {
  uid: string;
  authorUid: string;
  title: string;
  instrument: string;
  format: string;
  visibility: string;
  relatedProjects?: string[];
  productId?: string | null;
}