// packages/infrastructure/src/database/models/graph/sujet.graph.ts

/**
 * 🕸️ LA STRUCTURE DU NŒUD SUJET DANS NEO4J (Le Graphe Muet)
 */
export interface ISujetGraphNode {
  uid: string;
  title: string;
  category: string;
  status: string;
  createdAt: string | Date;
  updatedAt?: string | Date;
}

/**
 * LES RELATIONS FONDAMENTALES DU SUJET DANS LE GRAPHE (tom§hat§toes)
 * 
 * - (:User {uid}) -[:WROTE]-> (:Sujet {uid})
 * - (:Sujet {uid}) -[:ILLUMINATES]-> (:Project {uid})
 * - (:Sujet {uid}) -[:DETAILS]-> (:Task {uid})
 * - (:Sujet {uid}) -[:OFFERS_PRODUCT]-> (:Product {uid}) // 🛍️ Suture e-commerce
 * - (:Sujet {uid}) -[:ECHOES]-> (:Sujet {uid})           // Pour les réponses entre articles
 * - (:Sujet {uid}) -[:UNLOCKS]-> (:Game {uid})           // Pour les récompenses
 * - (:User {uid}) -[:RESONATED_WITH {emoji: string}]-> (:Sujet {uid}) // Pour les réactions (<(:< ou >:)>)
 */
export enum SujetRelationshipType {
  WROTE = 'WROTE',
  ILLUMINATES = 'ILLUMINATES',
  DETAILS = 'DETAILS',
  OFFERS_PRODUCT = 'OFFERS_PRODUCT',
  ECHOES = 'ECHOES',
  UNLOCKS = 'UNLOCKS',
  RESONATED_WITH = 'RESONATED_WITH'
}

/**
 * CONTRAT DES CONNEXIONS GRAPHE POUR UN SUJET
 */
export interface ISujetGraphContext {
  actorUid: string;
  sujetUid: string;
  title: string;
  category: string;
  status: string;
  relatedProjects?: string[];
  relatedTasks?: string[];
  productId?: string | null;
}