// packages/infrastructure/src/database/models/graph/sujet.graph.ts

/**
 * La structure du Noeud Sujet dans Neo4j
 */
export interface ISujetGraphNode {
    uid: string;
    category: string;
    status: string;
    createdAt: string;
}

/**
 * Les relations fondamentales du Sujet dans le Graphe
 *
 * (:User {uid}) -[:WROTE]-> (:Sujet {uid})
 * (:Sujet {uid}) -[:ILLUMINATES]-> (:Project {uid})
 * (:Sujet {uid}) -[:ECHOES]-> (:Sujet {uid})          // Pour les réponses entre articles
 * (:Sujet {uid}) -[:UNLOCKS]-> (:Game {uid})          // Pour tes idées de récompenses
 * (:User {uid}) -[:RESONATED_WITH {emoji: "<(:<"}]-> (:Sujet {uid}) // Pour les réactions !
 */