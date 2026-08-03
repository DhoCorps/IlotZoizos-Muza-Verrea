/**
 * 🔠 LA STRUCTURE DU NŒUD LETRIN DANS NEO4J
 */
export interface ILetrinGraphNode {
  uid: string;
  title: string;
  resolution: number;
  visibility: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

/**
 * 🔗 LES RELATIONS FONDAMENTALES DE LETR'IN
 * - (:Oiseau {uid}) -[:SCULPTED]-> (:LetrinSprite {uid})
 * - (:LetrinSprite {uid}) -[:LINKED_TO_PROJECT]-> (:Project {uid})
 * - (:LetrinSprite {uid}) -[:OFFERS_PRODUCT]-> (:Product {uid})
 */
export enum LetrinRelationshipType {
  SCULPTED = 'SCULPTED',
  LINKED_TO_PROJECT = 'LINKED_TO_PROJECT',
  OFFERS_PRODUCT = 'OFFERS_PRODUCT'
}

export interface ILetrinGraphContext {
  uid: string;
  authorUid: string;
  title: string;
  resolution: number;
  visibility: string;
  relatedProjects?: string[];
  productId?: string | null;
}