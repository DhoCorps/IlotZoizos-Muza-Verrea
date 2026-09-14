import { Session, Transaction } from 'neo4j-driver';

export interface AnchorMediaParams {
  creatorId: string;
  mediaId: string;
  type: string;
  sourceApp: string;
}

export class UniversalMediaGraph {
  /**
   * Ancre un UniversalMedia dans la matrice Neo4j et tisse la relation 
   * incassable avec son créateur (Oiseau).
   */
  static async anchorMedia(tx: Transaction | Session, params: AnchorMediaParams) {
    const query = `
      // 1. On s'assure que l'Oiseau existe dans le graphe
      MERGE (o:Oiseau { uid: $creatorId })
      
      // 2. On ancre le Média Universel
      MERGE (m:UniversalMedia { mediaId: $mediaId })
      SET m.type = $type,
          m.sourceApp = $sourceApp,
          m.updatedAt = timestamp()
          
      // 3. On forge le lien de création
      MERGE (o)-[r:CREATED]->(m)
      ON CREATE SET r.createdAt = timestamp()
      
      RETURN o, r, m
    `;

    const result = await tx.run(query, params);
    return result.records;
  }

  /**
   * (Optionnel) Pour supprimer l'ancrage si un média est détruit ou purgé
   */
  static async purgeMedia(tx: Transaction | Session, mediaId: string) {
    const query = `
      MATCH (m:UniversalMedia { mediaId: $mediaId })
      DETACH DELETE m
    `;
    
    await tx.run(query, { mediaId });
  }
}