import { getNeo4jSession } from '../../neo4j';
import { SubscriptionTargetType } from '@ilot/types';

/**
 * 🌿 Weaves a FOLLOWS relationship in the Graph (La Canopée)
 */
export const weaveFollowLink = async (
  subscriberUid: string,
  targetUid: string,
  targetType: SubscriptionTargetType
) => {
  const session = getNeo4jSession();
  
  // MATCH (u:User) garantit que le créateur du lien est bien un utilisateur
  // MATCH (t) sans label permet de cibler n'importe quel nœud existant
  const cypher = `
    MATCH (u:User { uid: $subscriberUid })
    MATCH (t { uid: $targetUid })
    MERGE (u)-[r:FOLLOWS]->(t)
    ON CREATE SET 
      r.createdAt = datetime(),
      r.targetType = $targetType
    RETURN r
  `;

  try {
    const result = await session.run(cypher, {
      subscriberUid,
      targetUid,
      targetType
    });

    if (result.records.length === 0) {
      throw new Error("Cannot weave link: User or Target not found in the matrix.");
    }

    console.log(`[Neo4j] User ${subscriberUid} followed ${targetUid} (${targetType}).`);
    return result.records[0].get('r').properties;
  } finally {
    await session.close();
  }
};

/**
 * 🍂 Severs a FOLLOWS relationship in the Graph
 */
export const severFollowLink = async (
  subscriberUid: string,
  targetUid: string
) => {
  const session = getNeo4jSession();
  
  const cypher = `
    MATCH (u:User { uid: $subscriberUid })-[r:FOLLOWS]->(t { uid: $targetUid })
    DELETE r
  `;

  try {
    await session.run(cypher, {
      subscriberUid,
      targetUid
    });
    
    console.log(`[Neo4j] The FOLLOWS link between ${subscriberUid} and ${targetUid} has been severed.`);
    return true;
  } finally {
    await session.close();
  }
};